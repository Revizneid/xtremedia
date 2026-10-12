const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🚀 Starting XtreMedia V2 Auth API Tests...\n');

  // Test 1: Admin Login with valid credentials
  console.log('1️⃣ Testing Admin Login (admin / admin123)...');
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'admin123' }),
  });
  const dataLogin = await resLogin.json();
  const setCookie = resLogin.headers.get('set-cookie');
  console.log('Status:', resLogin.status);
  console.log('Response:', dataLogin);
  console.log('Set-Cookie exists:', !!setCookie);
  if (resLogin.status !== 200 || dataLogin.user?.role !== 'ADMIN' || !setCookie) {
    throw new Error('Test 1 Failed: Admin login did not return expected response or cookie');
  }
  console.log('✅ Test 1 Passed!\n');

  // Extract session cookie for subsequent tests
  const sessionCookie = setCookie.split(';')[0];

  // Test 2: Admin Login with wrong password
  console.log('2️⃣ Testing Login with invalid password...');
  const resBadLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin', password: 'wrongpassword' }),
  });
  const dataBadLogin = await resBadLogin.json();
  console.log('Status:', resBadLogin.status);
  console.log('Response:', dataBadLogin);
  if (resBadLogin.status !== 401) {
    throw new Error('Test 2 Failed: Expected 401 Unauthorized');
  }
  console.log('✅ Test 2 Passed!\n');

  // Test 3: Session Check via /api/auth/me with valid cookie
  console.log('3️⃣ Testing Session Check (/api/auth/me) with cookie...');
  const resMe = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const dataMe = await resMe.json();
  console.log('Status:', resMe.status);
  console.log('User Profile:', dataMe.user);
  if (resMe.status !== 200 || dataMe.user?.username !== 'admin') {
    throw new Error('Test 3 Failed: /api/auth/me did not return correct user');
  }
  console.log('✅ Test 3 Passed!\n');

  // Test 4: Register new user
  const uniqueSuffix = Date.now().toString().slice(-4);
  const testUser = {
    username: `vietnam_${uniqueSuffix}`,
    email: `member_${uniqueSuffix}@xtremedia.vn`,
    displayName: `Thành Viên Test ${uniqueSuffix}`,
    password: 'password123',
  };
  console.log(`4️⃣ Testing User Registration (${testUser.username})...`);
  const resReg = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const dataReg = await resReg.json();
  console.log('Status:', resReg.status);
  console.log('Response:', dataReg);
  if (resReg.status !== 201 || dataReg.user?.username !== testUser.username) {
    throw new Error('Test 4 Failed: Registration failed');
  }
  console.log('✅ Test 4 Passed!\n');

  // Test 5: Register duplicate username
  console.log('5️⃣ Testing Duplicate Username Registration...');
  const resDup = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const dataDup = await resDup.json();
  console.log('Status:', resDup.status);
  console.log('Response:', dataDup);
  if (resDup.status !== 400) {
    throw new Error('Test 5 Failed: Expected 400 Bad Request for duplicate username');
  }
  console.log('✅ Test 5 Passed!\n');

  // Test 6: Logout
  console.log('6️⃣ Testing Logout (/api/auth/logout)...');
  const resLogout = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });
  const dataLogout = await resLogout.json();
  const logoutCookie = resLogout.headers.get('set-cookie');
  console.log('Status:', resLogout.status);
  console.log('Response:', dataLogout);
  console.log('Logout Set-Cookie:', logoutCookie);
  if (resLogout.status !== 200 || !logoutCookie?.includes('Max-Age=0')) {
    throw new Error('Test 6 Failed: Logout did not clear cookie');
  }
  console.log('✅ Test 6 Passed!\n');

  // Test 7: Comment without authentication -> Should be 401
  console.log('7️⃣ Testing Protected Comment Endpoint without auth...');
  const resUnauthComment = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId: 'song-1', content: 'Bài hát rất hay!' }),
  });
  const dataUnauthComment = await resUnauthComment.json();
  console.log('Status:', resUnauthComment.status);
  console.log('Response:', dataUnauthComment);
  if (resUnauthComment.status !== 401) {
    throw new Error('Test 7 Failed: Unauthenticated comment should return 401');
  }
  console.log('✅ Test 7 Passed!\n');

  // Test 8: Comment with authenticated session
  console.log('8️⃣ Testing Protected Comment Endpoint with Admin session...');
  const resAuthComment = await fetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    },
    body: JSON.stringify({ songId: 'song-1', content: 'Tuyệt tác âm nhạc! Âm thanh cực chuẩn.' }),
  });
  const dataAuthComment = await resAuthComment.json();
  console.log('Status:', resAuthComment.status);
  console.log('Created Comment:', dataAuthComment.comment);
  if (resAuthComment.status !== 201 || dataAuthComment.comment?.userName !== 'XtreMedia Administrator') {
    throw new Error('Test 8 Failed: Authenticated comment post failed');
  }
  console.log('✅ Test 8 Passed!\n');

  // Test 9: Get comments for song-1
  console.log('9️⃣ Testing Get Comments for song-1...');
  const resGetComments = await fetch(`${BASE_URL}/api/comments?songId=song-1`);
  const dataGetComments = await resGetComments.json();
  console.log('Status:', resGetComments.status);
  console.log('Comments count for song-1:', dataGetComments.comments?.length);
  if (resGetComments.status !== 200 || dataGetComments.comments?.length < 1) {
    throw new Error('Test 9 Failed: Could not get comments');
  }
  console.log('✅ Test 9 Passed!\n');

  console.log('🎉 ALL PHASE 2 AUTH & RBAC TESTS PASSED SUCCESSFULLY! 100%');
}

testAuth().catch((err) => {
  console.error('❌ Test script failed:', err);
  process.exit(1);
});
