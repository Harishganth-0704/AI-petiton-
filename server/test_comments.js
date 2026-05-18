import pool from './db.js';

async function testComments() {
    console.log('--- Testing Comments API ---');
    try {
        // 1. Fetch a petition and a user
        const petRes = await pool.query('SELECT id FROM petitions LIMIT 1');
        const userRes = await pool.query("SELECT id, name FROM users WHERE role = 'citizen' LIMIT 1");
        
        if (petRes.rows.length === 0 || userRes.rows.length === 0) {
            console.log('Not enough data to test.');
            process.exit(0);
        }
        
        const petitionId = petRes.rows[0].id;
        const userId = userRes.rows[0].id;
        const userName = userRes.rows[0].name;

        console.log(`Adding test comment for Petition ${petitionId} from User ${userName}...`);

        // Insert comment
        const newComment = await pool.query(
            'INSERT INTO petition_comments (petition_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [petitionId, userId, "This is an automated test comment to verify the discussion feature works!"]
        );

        console.log('Comment created:', newComment.rows[0]);

        // Fetch comments
        const fetchComments = await pool.query(`
            SELECT pc.*, u.name as user_name, u.role 
            FROM petition_comments pc 
            JOIN users u ON pc.user_id = u.id 
            WHERE pc.petition_id = $1 
            ORDER BY pc.created_at ASC
        `, [petitionId]);

        console.log(`Fetched ${fetchComments.rows.length} comments for petition ${petitionId}.`);

    } catch (error) {
        console.error('Error during test:', error);
    } finally {
        process.exit(0);
    }
}

testComments();
