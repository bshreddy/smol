
import * as crypto from 'crypto';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';

const encodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const dynDB = new DynamoDB.DocumentClient();
const { tableName, primaryKey } = {
    tableName: '',
    primaryKey: '',
    ...process.env
};

/* eslint-disable no-unused-vars */
enum Status {
    SUCCESS = 'success',
    CLIENT_ERROR = 'error',
    INTERNAL_ERROR = 'error'
}
/* eslint-enable no-unused-vars */

const statusCode: Record<Status, number> = {
    [Status.SUCCESS]: 200,
    [Status.CLIENT_ERROR]: 400,
    [Status.INTERNAL_ERROR]: 500
};

const getResponse = (status: Status, body: { [key: string]: any }): APIGatewayProxyResult => {
    return {
        statusCode: statusCode[status],
        body: JSON.stringify({ status, ...body })
    };
};

const getRandomHash = (length: number): string => {
    const hashBfr = crypto.randomBytes(length) ;//.toString('base64');
    let hash = '';

    for (let i = 0; i < hashBfr.length; i += 1) {
        hash += encodeChars[hashBfr.readUInt8(i) % encodeChars.length];
    }

    return hash;
};

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const { url } = JSON.parse(event.body ?? '');

    const { domainName, hashLen, hashTTL } = {
        domainName: process.env.domainName,
        hashLen: Number(process.env.hashLen) ?? 6,
        hashTTL: Number(process.env.hashTTL) ?? 604800
    };

    console.log({ domainName, hashLen, hashTTL });

    if (!event.body) { return getResponse(Status.CLIENT_ERROR, { error: 'No body provided' }); }
    if (!url) { return getResponse(Status.CLIENT_ERROR, { error: 'No "url" found in body' }); }

    // Add protocol if not present

    try {
        const id = getRandomHash(hashLen);
        const short_url = `https://${domainName}/${id}`;
        const ttl = Date.now() + hashTTL;

        await dynDB.put({
            TableName: tableName,
            Item: {
                [primaryKey]: id,
                url,
                ttl
            },
            ConditionExpression: `attribute_not_exists(${primaryKey})`
        }).promise();

        // An error occurred (ConditionalCheckFailedException)
        // when calling the PutItem operation: The conditional request failed

        return getResponse(Status.SUCCESS, { short_url, url, ttl });
    } catch (err) {
        console.error(err);
        console.error(`An Error Occurred.\n${err}`);
        return getResponse(Status.INTERNAL_ERROR, { error: 'Internal Server Error' });
    }
};

export { handler };
