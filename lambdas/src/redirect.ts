
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const dynDB = new DynamoDB.DocumentClient();
const { tableName, primaryKey } = {
    tableName: '',
    primaryKey: '',
    ...process.env
};

const redirectTo = (redirectUrl: string): APIGatewayProxyResult => {
    return {
        statusCode: 301,
        headers: {
            Location: redirectUrl
        },
        body: `This is a redriect response.<br /><br />If you aren\'t redirected, <a href="${redirectUrl}">Click Here</a>`
    };
};

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    if (!event.pathParameters || !event.pathParameters.hash) {
        return redirectTo(`http://${process.env.rootDomain}` ?? 'https://bshreddy.com');
    }

    const { hash } = event.pathParameters;

    try {
        const res = await dynDB.get({
            TableName: tableName,
            Key: {
                [primaryKey]: hash
            }
        }).promise();

        const item = res.Item;

        if (item) {
            console.log(`Request succeeded. ${hash} is associated with ${item.url}`);

            return redirectTo(item.url);
        } else {
            console.error(`Input Error: Invalid hash: ${hash}`);

            return {
                statusCode: 404,
                body: 'Invalid hash'
            };
        }
    } catch (err) {
        console.error(`Error Occurred while reading database.\n${err}`);

        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
};

export { handler };
