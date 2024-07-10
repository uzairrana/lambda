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

        const { startTime, endTime, day, user } = body;
        if (!startTime || !endTime || !day) {
            throw new Error('Missing required fields: startTime, endTime, or day');
        }

        // Check for overlapping schedules
        const overlapQuery = `
            SELECT * FROM "public"."Schedules"
            WHERE "day" = $1 AND "user" = $2 AND (
                ($3 < "endTime" AND $4 > "startTime")
            );
        `;
        const overlapValues = [day, user, startTime, endTime];
        const overlapResult = await client.query(overlapQuery, overlapValues);

        if (overlapResult.rows.length > 0) {
            const response = {
                statusCode: 400,
                body: JSON.stringify({ message: 'Schedule time overlaps with an existing schedule' }),
            };
            return response;
        }

        // Insert new schedule
        const insertQuery = `
            INSERT INTO "public"."Schedules" ("startTime", "endTime", "day", "user") 
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        const insertValues = [startTime, endTime, day, user];
        const insertResult = await client.query(insertQuery, insertValues);
        
        const response = {
            statusCode: 200,
            body: JSON.stringify(insertResult.rows[0]),
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
