const handler = async (event: any, context: any) => {
    return {
        statusCode: 301,
        headers: {
            Location: 'https://bshreddy.com'
        }
    };
};

export {handler}
