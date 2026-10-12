const BASE_URL = 'http://localhost:3000';

async function testAdmin() {
  console.log('🚀 Starting XtreMedia V2 Phase 3 (AdminCP & RBAC) Tests...\n');

  // Test 1: Unauthenticated request to /api/admin/stats
  console.log('1️⃣ Testing Unauthenticated access to /api/admin/stats...');
  const resUnauth = await fetch(`${BASE_URL}/api/admin/stats`);
  const dataUnauth = await resUnauth.json();
  console.log('Status:', resUnauth.status);
  console.log('Response:', dataUnauth);
  if (resUnauth.status !== 401) {
    throw new Error('Test 1 Failed: Expected 401 Unauthorized for unauthenticated request');
  }
  console.log('✅ Test 1 Passed!\n');

  // Test 2: Standard user login (role USER) attempting admin access
  console.log('2️⃣ Testing Standard User (member / member123) access to /api/admin/stats...');
  const resMemberLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'member', password: 'member123' }),
  });
  const memberCookie = resMemberLogin.headers.get('set-cookie')?.split(';')[0];
  const resMemberAdmin = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: memberCookie || '' },
  });
  const dataMemberAdmin = await resMemberAdmin.json();
  console.log('Status:', resMemberAdmin.status);
  console.log('Response:', dataMemberAdmin);
  if (resMemberAdmin.status !== 403) {
    throw new Error('Test 2 Failed: Expected 403 Forbidden for non-admin user');
  }
  console.log('✅ Test 2 Passed!\n');

  // Test 3: Admin login
  console.log('3️⃣ Logging in as Admin (admin / admin123)...');
  const resAdminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'admin123' }),
  });
  const adminCookie = resAdminLogin.headers.get('set-cookie')?.split(';')[0];
  if (!adminCookie) throw new Error('Test 3 Failed: Could not get admin session cookie');
  console.log('Admin session acquired successfully!');
  console.log('✅ Test 3 Passed!\n');

  // Test 4: Admin fetches /api/admin/stats
  console.log('4️⃣ Testing Admin fetching /api/admin/stats...');
  const resStats = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: { Cookie: adminCookie },
  });
  const dataStats = await resStats.json();
  console.log('Status:', resStats.status);
  console.log('Stats:', dataStats.stats);
  if (resStats.status !== 200 || !dataStats.success || typeof dataStats.stats.totalSongs !== 'number') {
    throw new Error('Test 4 Failed: Expected 200 and valid statistics object');
  }
  console.log('✅ Test 4 Passed!\n');

  // Test 5: Admin creates a new song with LRC lyrics
  console.log('5️⃣ Testing Admin creating new song via POST /api/admin/songs...');
  const newSongPayload = {
    title: 'Hà Nội Mùa Lá Bay (Admin Test)',
    artistName: 'Hà Anh Tuấn',
    genreName: 'Acoustic & Chill',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_rain_medium.ogg',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80',
    durationSeconds: 260,
    bitrateKbps: 320,
    lyricsLrc: '[00:00.00] Hà Nội Mùa Lá Bay\n[00:10.00] Từng chiếc lá thu vàng rơi bên thềm cũ...',
  };
  const resCreateSong = await fetch(`${BASE_URL}/api/admin/songs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify(newSongPayload),
  });
  const dataCreateSong = await resCreateSong.json();
  console.log('Status:', resCreateSong.status);
  console.log('Created Song:', dataCreateSong.song?.title, 'ID:', dataCreateSong.song?.id);
  if (resCreateSong.status !== 201 || !dataCreateSong.song?.id) {
    throw new Error('Test 5 Failed: Song creation failed');
  }
  const createdSongId = dataCreateSong.song.id;
  console.log('✅ Test 5 Passed!\n');

  // Test 6: Report created song as broken
  console.log(`6️⃣ Testing Reporting song ${createdSongId} as broken...`);
  const resReportBroken = await fetch(`${BASE_URL}/api/songs/${createdSongId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'report_broken' }),
  });
  const dataReportBroken = await resReportBroken.json();
  console.log('Status:', resReportBroken.status);
  console.log('Report Broken Response:', dataReportBroken);
  if (resReportBroken.status !== 200 || !dataReportBroken.success) {
    throw new Error('Test 6 Failed: Broken report failed');
  }
  console.log('✅ Test 6 Passed!\n');

  // Test 7: Admin inspects /api/admin/broken
  console.log('7️⃣ Testing Admin fetching /api/admin/broken...');
  const resGetBroken = await fetch(`${BASE_URL}/api/admin/broken`, {
    headers: { Cookie: adminCookie },
  });
  const dataGetBroken = await resGetBroken.json();
  console.log('Status:', resGetBroken.status);
  console.log('Broken Songs Count:', dataGetBroken.count);
  const foundBroken = dataGetBroken.brokenSongs.some((s) => s.id === createdSongId);
  if (resGetBroken.status !== 200 || !foundBroken) {
    throw new Error('Test 7 Failed: Created broken song not found in admin broken list');
  }
  console.log('✅ Test 7 Passed!\n');

  // Test 8: Admin fixes the broken link
  console.log('8️⃣ Testing Admin fixing broken link via POST /api/admin/broken...');
  const resFixBroken = await fetch(`${BASE_URL}/api/admin/broken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      songId: createdSongId,
      newAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    }),
  });
  const dataFixBroken = await resFixBroken.json();
  console.log('Status:', resFixBroken.status);
  console.log('Fix Response:', dataFixBroken);
  if (resFixBroken.status !== 200 || !dataFixBroken.success) {
    throw new Error('Test 8 Failed: Could not fix broken link');
  }
  console.log('✅ Test 8 Passed!\n');

  // Test 9: Admin updates song details
  console.log('9️⃣ Testing Admin updating song details via PUT /api/admin/songs/[id]...');
  const resUpdateSong = await fetch(`${BASE_URL}/api/admin/songs/${createdSongId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      title: 'Hà Nội Mùa Lá Bay (Remastered 2026)',
      durationSeconds: 280,
    }),
  });
  const dataUpdateSong = await resUpdateSong.json();
  console.log('Status:', resUpdateSong.status);
  console.log('Updated Title:', dataUpdateSong.song?.title);
  if (resUpdateSong.status !== 200 || dataUpdateSong.song?.title !== 'Hà Nội Mùa Lá Bay (Remastered 2026)') {
    throw new Error('Test 9 Failed: Could not update song');
  }
  console.log('✅ Test 9 Passed!\n');

  // Test 10: Admin deletes song
  console.log(`🔟 Testing Admin deleting song ${createdSongId}...`);
  const resDeleteSong = await fetch(`${BASE_URL}/api/admin/songs/${createdSongId}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookie },
  });
  const dataDeleteSong = await resDeleteSong.json();
  console.log('Status:', resDeleteSong.status);
  console.log('Delete Response:', dataDeleteSong);
  if (resDeleteSong.status !== 200 || !dataDeleteSong.success) {
    throw new Error('Test 10 Failed: Could not delete song');
  }
  console.log('✅ Test 10 Passed!\n');

  // Test 11: Admin gets users list
  console.log('1️⃣1️⃣ Testing Admin fetching users list via /api/admin/users...');
  const resGetUsers = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: adminCookie },
  });
  const dataGetUsers = await resGetUsers.json();
  console.log('Status:', resGetUsers.status);
  console.log('Total Users:', dataGetUsers.count);
  if (resGetUsers.status !== 200 || dataGetUsers.count < 2) {
    throw new Error('Test 11 Failed: Could not fetch users');
  }
  console.log('✅ Test 11 Passed!\n');

  console.log('🎉 ALL 11 PHASE 3 ADMIN & RBAC TESTS PASSED SUCCESSFULLY! 100%');
}

testAdmin().catch((err) => {
  console.error('❌ Phase 3 test failed:', err);
  process.exit(1);
});
