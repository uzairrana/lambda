import pg from 'pg';
const { Client } = pg;

export const handler = async (event) => {
    const conn = "replace your connection string here";
    const client = new Client(conn);

    try {
        await client.connect();

        if (!event.body) {
            throw new Error('Event body is undefined');
        }

        let body;
        try {
            body = JSON.parse(event.body);
        } catch (parseError) {
            throw new Error(`Invalid JSON: ${parseError.message}`);
        }

        const { id } = body;
        if (!id) {
            throw new Error('Missing required field: id');
        }

        // Check if the schedule exists
        const existingQuery = `
            SELECT * FROM "public"."Schedules"
            WHERE "id" = $1;
        `;
        const existingResult = await client.query(existingQuery, [id]);

        if (existingResult.rows.length === 0) {
            const response = {
                statusCode: 404,
                body: JSON.stringify({ message: 'Schedule not found' }),
            };
            return response;
        }

        // Delete the schedule
        const deleteQuery = `
            DELETE FROM "public"."Schedules"
            WHERE "id" = $1
            RETURNING *;
        `;
        const deleteResult = await client.query(deleteQuery, [id]);

        const response = {
            statusCode: 200,
            body: JSON.stringify(deleteResult.rows[0]),
        };
        return response;
    } catch (err) {
        console.error('Error executing query', err);
        const response = {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: err.message }),
        };
        return response;
    } finally {
        await client.end();
    }
};
