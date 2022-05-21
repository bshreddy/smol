
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynDB = new DynamoDB.DocumentClient();

const redirectTo = (redirectUrl: string): APIGatewayProxyResult => {
    return {
        statusCode: 301,
        headers: {
            Location: redirectUrl
        },
        body: `This is a redriect response.<br /><br />If you aren\'t redirected, <a href=${redirectUrl}>Click Here</a>`
    };
};

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (!event.pathParameters || !event.pathParameters.hash) {
        return redirectTo(`http://${process.env.ROOT_DOMAIN}` ?? 'https://bshreddy.com');
    }

    const { hash } = event.pathParameters;
    const { tableName, primaryKey } = {
        tableName: '',
        primaryKey: '',
        ...process.env
    };

    try {
        const params = {
            TableName: tableName,
            Key: {
                [primaryKey]: hash
            }
        };

        console.log(`PARAMS\n${JSON.stringify(params, null, 2)}`);

        const res = await dynDB.get(params).promise();

        const item = res.Item;

        if (item) {
            return redirectTo(item.url);
        } else {
            console.log(`ENVIRONMENT VARIABLES\n${JSON.stringify(process.env, null, 2)}`);
            console.log(`EVENT\n${JSON.stringify(event, null, 2)}`);
            console.error(`Input Error: Invalid hash: ${hash}`);

            return {
                statusCode: 404,
                body: 'Invalid hash'
            };
        }
    } catch (dbError) {
        console.log(`ENVIRONMENT VARIABLES\n${JSON.stringify(process.env, null, 2)}`);
        console.log(`EVENT\n${JSON.stringify(event, null, 2)}`);

        console.error(`Error Occurred while reading database.\n${JSON.stringify(dbError, null, 2)}`);
        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
};

export { handler };
