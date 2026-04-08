const http = require('http');
const fs = require('fs');

async function test() {
  let out = "";
  const email = `TEST_${Date.now()}@test.com`;
  const password = "password123";

  out += "Email: " + email + "\n";
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
  out += "Register status: " + res1.status + "\n";
  const data1 = await res1.json();
  out += "Register data: " + JSON.stringify(data1) + "\n";

  const res2 = await fetch('http://localhost:5000/api/auth/login/hospital', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  out += "Login status: " + res2.status + "\n";
  const data2 = await res2.json();
  out += "Login data: " + JSON.stringify(data2) + "\n";
  
  fs.writeFileSync('test_out3.txt', out);
}

test();
