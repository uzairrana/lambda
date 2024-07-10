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

        const { id, startTime, endTime, day, user } = body;
        if (!id || !startTime || !endTime || !day || !user) {
            throw new Error('Missing required fields: id, startTime, endTime, day, or user');
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

        // Check for overlapping schedules excluding the current one
        const overlapQuery = `
            SELECT * FROM "public"."Schedules"
            WHERE "day" = $1 AND "user" = $2 AND "id" != $3 AND (
                ($4 < "endTime" AND $5 > "startTime")
            );
        `;
        const overlapValues = [day, user, id, startTime, endTime];
        const overlapResult = await client.query(overlapQuery, overlapValues);

        if (overlapResult.rows.length > 0) {
            const response = {
                statusCode: 400,
                body: JSON.stringify({ message: 'Schedule time overlaps with an existing schedule' }),
            };
            return response;
        }

        // Update the schedule
        const updateQuery = `
            UPDATE "public"."Schedules"
            SET "startTime" = $1, "endTime" = $2, "day" = $3, "user" = $4
            WHERE "id" = $5
            RETURNING *;
        `;
        const updateValues = [startTime, endTime, day, user, id];
        const updateResult = await client.query(updateQuery, updateValues);

        const response = {
            statusCode: 200,
            body: JSON.stringify(updateResult.rows[0]),
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
