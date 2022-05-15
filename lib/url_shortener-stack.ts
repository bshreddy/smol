import * as path from 'path';
import {Stack, StackProps} from 'aws-cdk-lib';
import {LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';
import {Certificate} from 'aws-cdk-lib/aws-certificatemanager';
import {Table, Attribute, AttributeType} from 'aws-cdk-lib/aws-dynamodb';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import {NodejsFunction, NodejsFunctionProps} from 'aws-cdk-lib/aws-lambda-nodejs';
import {ARecord, HostedZone, RecordTarget} from 'aws-cdk-lib/aws-route53';
import {ApiGateway} from 'aws-cdk-lib/aws-route53-targets';
import {Construct} from 'constructs';
import * as dotenv from 'dotenv';

dotenv.config();

export class UrlShortenerStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const {subDomain, rootDomain, certificateArn} = {
            subDomain: '',
            rootDomain: '',
            certificateArn: '',
            ...process.env
        };
        const domainName = `${subDomain}.${rootDomain}`;

        const dynamoTable_partitionKey: Attribute = {
            name: 'hash',
            type: AttributeType.STRING
        };

        const dynamoTable = new Table(this, 'url_hashes', {
            partitionKey: dynamoTable_partitionKey,
            tableName: 'url_hashes'
        });

        const nodejsFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk'
                ],
            },
            depsLockFilePath: path.join(__dirname, '..', 'lambdas', 'package-lock.json'),
            environment: {
                PRIMARY_KEY: dynamoTable_partitionKey.name,
                TABLE_NAME: dynamoTable.tableName,
            },
            runtime: Runtime.NODEJS_16_X
        };

        const registerLambda = new NodejsFunction(this, 'register', {
            entry: path.join(__dirname, '..', 'lambdas', 'register.ts'),
            ...nodejsFunctionProps
        });

        const redirectLambda = new NodejsFunction(this, 'redirect', {
            entry: path.join(__dirname, '..', 'lambdas', 'redirect.ts'),
            ...nodejsFunctionProps
        });

        dynamoTable.grantReadWriteData(registerLambda);
        dynamoTable.grantReadData(redirectLambda);

        const api = new RestApi(this, 'url_shortener_api', {
            restApiName: 'URL Shortener Service',
            domainName: {
                domainName: domainName,
                certificate: Certificate.fromCertificateArn(
                    this,
                    'domainCertificate',
                    certificateArn
                ),
            },
        });

        api.root.addMethod('POST', new LambdaIntegration(registerLambda));
        api.root.addMethod('GET', new LambdaIntegration(redirectLambda));

        const hostedZone = HostedZone.fromLookup(this, 'hostedZone', {
            domainName: rootDomain
        });

        // eslint-disable-next-line no-unused-vars
        const domainRecord = new ARecord(this, 'domainRecord', {
            recordName: domainName,
            zone: hostedZone,
            target: RecordTarget.fromAlias(new ApiGateway(api)),
        });
    }
}
