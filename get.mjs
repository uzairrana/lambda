import pg from 'pg';
const { Client } = pg;

export const handler = async (event) => {
    const conn = "replace your connection string here";

    const client = new Client(conn);
    
    try {
        await client.connect();
        
        const res = await client.query('SELECT * FROM "public"."Schedules"');
             const schedules = res.rows;
        
        const response = {
           statusCode: 200,
           body: JSON.stringify(schedules),
        }
        return response;
    } catch (err) {
        console.error('Error executing query', err);
        throw err;
    } finally {
        await client.end();
    }
};
 


