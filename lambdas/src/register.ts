
import * as crypto from 'crypto';
import { URL } from 'url';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AWSError, DynamoDB } from 'aws-sdk';
import { Status, STATUS_CODE } from './constants';

const encodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
const dynDB = new DynamoDB.DocumentClient();
const { tableName, primaryKey } = {
    tableName: '',
    primaryKey: '',
    ...process.env
};

const getResponse = (status: Status, body: { [key: string]: any }): APIGatewayProxyResult => {
    return {
        statusCode: STATUS_CODE[status],
        body: JSON.stringify({ status, ...body })
    };
};

const getRandomHash = (length: number): string => {
    const hashBfr = crypto.randomBytes(length);
    let hash = '';

    for (let i = 0; i < hashBfr.length; i += 1) {
        hash += encodeChars[hashBfr.readUInt8(i) % encodeChars.length];
    }

    return hash;
};

const putItemIntoDDB = async (id: string, url: string, ttl: number) => {
    await dynDB.put({
        TableName: tableName,
        Item: {
            [primaryKey]: id,
            url,
            ttl
        },
        ConditionExpression: `attribute_not_exists(${primaryKey})`
    }).promise();
};

const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    const { url, ttl } = JSON.parse(event.body ?? '');

    const { domain_name, hash_len, hash_ttl } = {
        domain_name: process.env.domainName,
        hash_len: Number(process.env.hashLen) ?? 6,
        hash_ttl: Number(process.env.hashTTL) ?? 604800
    };

    console.log({ domain_name, hash_len, hash_ttl });

    if (!event.body) { return getResponse(Status.CLIENT_ERROR, { error: 'No body provided' }); }
    if (!url) { return getResponse(Status.CLIENT_ERROR, { error: 'No "url" found in body' }); }

    try {
        const _url = new URL(url);
        const _ttl = Math.floor(Date.now()/1000) + (ttl ?? hash_ttl);
        let retries_left = 2;

        while (retries_left >= 0) {
            const id = getRandomHash(hash_len);
            const short_url = `https://${domain_name}/${id}`;

            try {
                await putItemIntoDDB(id, _url.href, _ttl);
                return getResponse(Status.SUCCESS, { short_url, url: _url.href, ttl: _ttl });
            } catch (error) {
                if ((error as AWSError).code === 'ConditionalCheckFailedException') {
                    console.log('Conditional check failed. Item already exists.');
                    retries_left -= 1;
                } else {
                    console.error('Error:', (error as AWSError).message);
                    throw error;
                }
            }
        }

        return getResponse(Status.INTERNAL_ERROR, { error: 'Internal Server Error' });
    } catch (err) {
        console.error(err);
        console.error(`An Error Occurred.\n${err}`);
        return getResponse(Status.INTERNAL_ERROR, { error: 'Internal Server Error' });
    }
};

export { handler };
