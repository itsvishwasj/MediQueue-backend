const http = require('http');

async function test() {
  const email = `test_${Date.now()}@test.com`;
  const password = "password123";

  // Register
  const res1 = await fetch('http://localhost:5000/api/auth/register/hospital', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalName: "Test Hosp",
      address: "123 Test",
      email,
      phone: "1234567890",
      password
    })
  });
  console.log("Register status:", res1.status);
  const data1 = await res1.json();
  console.log("Register data:", data1);

  // Login
  const res2 = await fetch('http://localhost:5000/api/auth/login/hospital', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  console.log("Login status:", res2.status);
  const data2 = await res2.json();
  console.log("Login data:", data2);
}

test();
