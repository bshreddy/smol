import { APIGatewayProxyResult } from 'aws-lambda';

const handler = async (): Promise<APIGatewayProxyResult> => {
    const redirectUrl = 'https://bshreddy.com';

    return {
        statusCode: 301,
        headers: {
            Location: redirectUrl
        },
        body: `This is a redriect response.<br /><br />If you aren\'t redirected, <a href=${redirectUrl}>Click Here</a>`
    };
};

export { handler };
