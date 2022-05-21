import * as path from 'path';
import { CloudFrontToApiGateway } from '@aws-solutions-constructs/aws-cloudfront-apigateway';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { EndpointType, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AllowedMethods } from 'aws-cdk-lib/aws-cloudfront';
import { Table, Attribute, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import * as dotenv from 'dotenv';


dotenv.config();

export class SmolStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const { subDomain, rootDomain, certificateArn, hashLen, hashTTL } = {
            subDomain: '',
            rootDomain: '',
            certificateArn: '',
            hashLen: '6',
            hashTTL: '604800',
            ...process.env
        };
        const domainName = `${subDomain}.${rootDomain}`;

        const dynamoTable_partitionKey: Attribute = {
            name: 'id',
            type: AttributeType.STRING
        };

        const dynamoTable_timeToLiveAttribute = 'ttl';

        const dynamoTable = new Table(this, 'url_hashes', {
            tableName: `${id}-urls`,
            partitionKey: dynamoTable_partitionKey,
            timeToLiveAttribute: dynamoTable_timeToLiveAttribute,
            removalPolicy: RemovalPolicy.DESTROY,
            billingMode: BillingMode.PAY_PER_REQUEST
        });

        const lambdaDir = path.join(__dirname, '..', 'lambdas');

        const lambdaSrcDir = path.join(lambdaDir, 'src');

        const nodejsFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    'aws-sdk'
                ],
            },
            depsLockFilePath: path.join(lambdaDir, 'package-lock.json'),
            environment: {
                primaryKey: dynamoTable_partitionKey.name,
                tableName: dynamoTable.tableName,
                timeToLiveAttribute: dynamoTable_timeToLiveAttribute,
                rootDomain,
                hashLen,
                hashTTL,
                domainName
            },
            runtime: Runtime.NODEJS_16_X
        };

        const registerLambda = new NodejsFunction(this, 'register', {
            entry: path.join(lambdaSrcDir, 'register.ts'),
            ...nodejsFunctionProps
        });

        const redirectLambda = new NodejsFunction(this, 'redirect', {
            entry: path.join(lambdaSrcDir, 'redirect.ts'),
            ...nodejsFunctionProps
        });

        dynamoTable.grantReadWriteData(registerLambda);
        dynamoTable.grantReadData(redirectLambda);

        const api = new RestApi(this, 'smol_api', {
            restApiName: `${id}-api`,
            endpointConfiguration: {
                types: [EndpointType.REGIONAL]
            }
        });

        api.root.addMethod('POST', new LambdaIntegration(registerLambda));
        api.root.addMethod('GET', new LambdaIntegration(redirectLambda));

        const redirectApi = api.root.addResource('{hash}');

        redirectApi.addMethod('GET', new LambdaIntegration(redirectLambda));

        const cloudFrontToApiGateway = new CloudFrontToApiGateway(this, 'test-cloudfront-apigateway', {
            existingApiGatewayObj: api,
            cloudFrontDistributionProps: {
                certificate: Certificate.fromCertificateArn(this, 'certificate', certificateArn),
                domainNames: [domainName],
                defaultBehavior: {
                    allowedMethods: AllowedMethods.ALLOW_ALL
                }
            }
        });

        const hostedZone = HostedZone.fromLookup(this, 'hostedZone', {
            domainName: rootDomain
        });

        /* Adding DNS Record */
        // eslint-disable-next-line no-new
        new ARecord(this, 'domainRecord', {
            recordName: domainName,
            zone: hostedZone,
            target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFrontToApiGateway.cloudFrontWebDistribution)),
        });

        /* Cloud Watch Logs Configuration */
        // eslint-disable-next-line no-new
        new LogGroup(this, 'logGroup', {
            retention: RetentionDays.ONE_WEEK
        });
    }
}
