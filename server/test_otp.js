async function testForgotPassword() {
    const email = 'verifier_corrected_2026@example.com';
    console.log(`Testing forgot-password for: ${email}`);

    try {
        const response = await fetch('http://localhost:5000/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', data);
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testForgotPassword();
