import fetch from 'node-fetch';

async function testAnalyze() {
    try {
        const response = await fetch('http://localhost:5000/api/petitions/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // We'll need a token for requireAuth, or I can temporarily disable it for testing.
                // Let's try it without first to see the 401 error.
            },
            body: JSON.stringify({
                title: 'Broken street light',
                description: 'The light at the corner of MG Road is not working since 3 days.',
                category: 'electricity'
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test Error:', error);
    }
}

testAnalyze();
