import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const handler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Not Yet Implemented',
            event,
            context
        }),
    };
};

export { handler };
