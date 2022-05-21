# smol: A URL Shortener implemented using AWS Services

`smol` is a simple URL shortener implemented using AWS services.

## Arch
- There are 2 lambda functions:
  - **register**: takes a long URL and returns a short URL
  - **redirect**: redirects to the long URL
- All the urls are stored in a dynamodb table.
- Api Gateway is used to expose the lambda functions.
  - **register**: POST /
  - **redirect**: GET /{hash}

`short_url` is a truncated hashcode string generated by the lambda function. The hashcode is generated using the long URL and a random salt. The hash is stored in the dynamodb table along with the long URL.

Currently long url is not encrypted. But, eventually, it should be encrypted using AWS KMS.

## Prerequisites
- AWS Account
- Custom Domain
- Node.js
- AWS CDK

## Deployment
- setup AWS CDK
- create a `.env` file, copy the variables from `.env.template` and update the values
- run `cdk synth`
- run `cdk deploy`
