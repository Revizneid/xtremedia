/**
 * XtreMedia 1.2 to V2 Migration Script
 * Reads legacy SQL dumps (e.g. data.sql) and imports categories, artists, albums, songs into V2 persistent store.
 */

const fs = require('fs');
const path = require('path');

// Target store file
const STORE_FILE = path.join(__dirname, '..', 'data', 'store.json');
const DEFAULT_SQL_PATH = path.join(__dirname, '..', '..', 'data.sql');

function unhtml(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
}

function toAscii(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function toSlug(str) {
  return toAscii(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseSQLTuples(sqlContent, tableName) {
  const results = [];
  const regex = new RegExp(`INSERT\\s+INTO\\s+\`?${tableName}\`?\\s*(?:\\([^)]+\\))?\\s*VALUES\\s*([\\s\\S]*?);`, 'gi');
  let match;

  while ((match = regex.exec(sqlContent)) !== null) {
    const valuesBlock = match[1];
    // Split tuples: (val1, val2), (val3, val4)
    const tupleRegex = /\(([^)]+)\)/g;
    let tupleMatch;
    while ((tupleMatch = tupleRegex.exec(valuesBlock)) !== null) {
      // Split by comma ignoring commas inside quotes
      const rawValues = tupleMatch[1];
      const parsedValues = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';

      for (let i = 0; i < rawValues.length; i++) {
        const char = rawValues[i];
        if ((char === "'" || char === '"') && rawValues[i - 1] !== '\\') {
          if (!inQuote) {
            inQuote = true;
            quoteChar = char;
          } else if (quoteChar === char) {
            inQuote = false;
          } else {
            current += char;
          }
        } else if (char === ',' && !inQuote) {
          parsedValues.push(cleanValue(current));
          current = '';
        } else {
          current += char;
        }
      }
      parsedValues.push(cleanValue(current));
      results.push(parsedValues);
    }
  }

  return results;
}

function cleanValue(v) {
  let val = v.trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.substring(1, val.length - 1);
  }
  return unhtml(val);
}

function runMigration(sqlFilePath = DEFAULT_SQL_PATH) {
  console.log('=====================================================');
  console.log('🚀 XtreMedia Legacy Data Migration Engine (v1.2 -> V2)');
  console.log('=====================================================');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ File SQL không tồn tại tại: ${sqlFilePath}`);
    return;
  }

  console.log(`📖 Đang đọc file: ${sqlFilePath}`);
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

  // Load existing store
  let store = {
    songs: [],
    artists: [],
    albums: [],
    genres: [],
    gifts: [],
    playlist: [],
    comments: [],
    config: {},
  };

  if (fs.existsSync(STORE_FILE)) {
    try {
      store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      console.log(`📦 Đã nạp dữ liệu hiện có từ store.json (${store.songs ? store.songs.length : 0} bài hát)`);
    } catch (e) {
      console.warn('⚠️ store.json không hợp lệ, sẽ khởi tạo mới.');
    }
  }

  // Fallback seed catalog if empty
  const defaultSeeds = require('./seeds.json');
  if (!store.genres || store.genres.length === 0) store.genres = defaultSeeds.genres;
  if (!store.artists || store.artists.length === 0) store.artists = defaultSeeds.artists;
  if (!store.albums || store.albums.length === 0) store.albums = defaultSeeds.albums;
  if (!store.songs || store.songs.length === 0) store.songs = defaultSeeds.songs;

  // 1. Parse media_config
  const configs = parseSQLTuples(sqlContent, 'media_config');
  let configCount = 0;
  for (const row of configs) {
    if (row.length >= 2) {
      const [name, val] = row;
      store.config[name] = val;
      configCount++;
    }
  }
  console.log(`✔ Đã import ${configCount} tham số cấu hình từ media_config`);

  // 2. Parse media_cat -> genres
  const cats = parseSQLTuples(sqlContent, 'media_cat');
  let catCount = 0;
  for (const row of cats) {
    // cat_id, m_title_ascii, cat_name, cat_type, cat_order, sub_id
    if (row.length >= 3) {
      const id = 'genre-legacy-' + row[0];
      const name = row[2] || row[1];
      const slug = toSlug(name);
      if (!store.genres.some((g) => g.slug === slug)) {
        store.genres.push({
          id,
          name,
          slug,
          parentId: row[5] && row[5] !== 'NULL' && row[5] !== '0' ? 'genre-legacy-' + row[5] : null,
          sortOrder: parseInt(row[4] || '0', 10),
        });
        catCount++;
      }
    }
  }
  console.log(`✔ Đã import ${catCount} thể loại từ media_cat`);

  // 3. Parse media_singer -> artists
  const singers = parseSQLTuples(sqlContent, 'media_singer');
  let singerCount = 0;
  for (const row of singers) {
    // singer_id, singer_name, singer_name_ascii, singer_img, singer_info, singer_type
    if (row.length >= 2) {
      const id = 'artist-legacy-' + row[0];
      const name = row[1];
      const slug = toSlug(name);
      if (!store.artists.some((a) => a.slug === slug)) {
        store.artists.push({
          id,
          name,
          nameAscii: row[2] || toAscii(name),
          slug,
          avatarUrl: row[3] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          bio: row[4] || 'Nghệ sĩ từ cơ sở dữ liệu XtreMedia 1.2',
          country: row[5] === '2' ? 'INTERNATIONAL' : 'VIETNAM',
          viewCount: 1000,
        });
        singerCount++;
      }
    }
  }
  console.log(`✔ Đã import ${singerCount} ca sĩ từ media_singer`);

  // 4. Parse media_album -> albums
  const albums = parseSQLTuples(sqlContent, 'media_album');
  let albumCount = 0;
  for (const row of albums) {
    // album_id, album_name, album_name_ascii, album_singer, album_img, album_info, album_viewed
    if (row.length >= 2) {
      const id = 'album-legacy-' + row[0];
      const title = row[1];
      const slug = toSlug(title);
      if (!store.albums.some((al) => al.slug === slug)) {
        const artist = store.artists.find((a) => a.id === 'artist-legacy-' + row[3]);
        store.albums.push({
          id,
          title,
          titleAscii: row[2] || toAscii(title),
          slug,
          coverUrl: row[4] || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
          description: row[5] || 'Album từ cơ sở dữ liệu XtreMedia 1.2',
          artistId: artist ? artist.id : 'artist-legacy-' + (row[3] || '1'),
          artistName: artist ? artist.name : 'Chưa cập nhật',
          releaseDate: '2007-01-01',
          viewCount: parseInt(row[6] || '0', 10),
        });
        albumCount++;
      }
    }
  }
  console.log(`✔ Đã import ${albumCount} albums từ media_album`);

  // 5. Parse media_data -> songs
  const songs = parseSQLTuples(sqlContent, 'media_data');
  let songCount = 0;
  for (const row of songs) {
    // m_id, m_title, m_title_ascii, m_singer, m_album, m_cat, m_url, m_poster, m_is_local, m_lyric, m_type, m_width, m_height, m_viewed, m_viewed_month, m_downloaded, m_downloaded_month, m_date, m_is_broken
    if (row.length >= 7) {
      const id = 'song-legacy-' + row[0];
      const title = row[1];
      const slug = toSlug(title);
      if (!store.songs.some((s) => s.slug === slug)) {
        const artist = store.artists.find((a) => a.id === 'artist-legacy-' + row[3]);
        const album = store.albums.find((al) => al.id === 'album-legacy-' + row[4]);
        const genre = store.genres.find((g) => g.id === 'genre-legacy-' + row[5]);

        store.songs.push({
          id,
          title,
          titleAscii: row[2] || toAscii(title),
          slug,
          artistId: artist ? artist.id : 'artist-1',
          artistName: artist ? artist.name : 'Nhiều nghệ sĩ',
          albumId: album ? album.id : null,
          albumTitle: album ? album.title : null,
          genreId: genre ? genre.id : 'genre-1',
          genreName: genre ? genre.name : 'Nhạc Trẻ V-Pop',
          audioUrl: row[6] || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          coverUrl: album ? album.coverUrl : 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80',
          durationSeconds: 240,
          bitrateKbps: 320,
          lyricsLrc: row[9] ? `[00:00.00] ${title}\n[00:10.00] ${row[9].replace(/<br>/gi, '\n')}` : null,
          playCount: parseInt(row[13] || '0', 10),
          playCountMonth: parseInt(row[14] || '0', 10),
          downloadCount: parseInt(row[15] || '0', 10),
          isBroken: row[18] === '1',
          status: 'ACTIVE',
          createdAt: row[17] && row[17] !== '0000-00-00' ? new Date(row[17]).toISOString() : new Date().toISOString(),
        });
        songCount++;
      }
    }
  }
  console.log(`✔ Đã import ${songCount} bài hát từ media_data`);

  // Save updated store
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  console.log('-----------------------------------------------------');
  console.log('🎉 MIGRATION HOÀN TẤT THÀNH CÔNG!');
  console.log(`📁 File lưu trữ hiện tại: ${STORE_FILE}`);
  console.log(`📊 Tổng số dữ liệu trong XtreMedia V2:`);
  console.log(`   - Thể loại: ${store.genres.length}`);
  console.log(`   - Ca sĩ:    ${store.artists.length}`);
  console.log(`   - Album:    ${store.albums.length}`);
  console.log(`   - Bài hát:  ${store.songs.length}`);
  console.log('=====================================================');
}

// Check command line arg or use default
const targetSql = process.argv[2] || DEFAULT_SQL_PATH;
runMigration(targetSql);
