const handler = async () => {
    return {
        statusCode: 301,
        headers: {
            Location: 'https://bshreddy.com'
        }
    };
};

export {handler};
