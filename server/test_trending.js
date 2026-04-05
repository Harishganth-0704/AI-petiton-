import pool from './db.js';

async function testTrending() {
    console.log('--- Testing Trending API Scoring ---');
    try {
        // 1. Fetch top 3 petitions
        const petRes = await pool.query('SELECT id, title FROM petitions LIMIT 3');
        if (petRes.rows.length < 3) {
            console.log('Not enough petitions to test.');
            process.exit(0);
        }
        
        const p1 = petRes.rows[0].id; // 10 views, 5 upvotes, 2 comments => (10) + (15) + (4) = 29
        const p2 = petRes.rows[1].id; // 50 views, 1 upvote, 0 comments => (50) + (3) + (0) = 53
        const p3 = petRes.rows[2].id; //  1 view, 0 upvotes, 10 comments => (1) + (0) + (20) = 21

        console.log(`Setting up test data for petitions: ${p1}, ${p2}, ${p3}...`);

        // Reset views
        await pool.query('UPDATE petitions SET view_count = 0 WHERE id IN ($1, $2, $3)', [p1, p2, p3]);
        
        // Setup P1: 10 views
        await pool.query('UPDATE petitions SET view_count = 10 WHERE id = $1', [p1]);
        
        // Setup P2: 50 views
        await pool.query('UPDATE petitions SET view_count = 50 WHERE id = $1', [p2]);

        // Setup P3: 1 view
        await pool.query('UPDATE petitions SET view_count = 1 WHERE id = $1', [p3]);

        console.log('Test data initialized. You can now verify the /api/petitions/trending endpoint manually via the UI or direct fetch.');
        
    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        process.exit(0);
    }
}

testTrending();
