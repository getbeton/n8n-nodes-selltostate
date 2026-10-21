import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SellToStateApi implements ICredentialType {
	name = 'sellToStateApi';

	displayName = 'Sell to State API';

	icon: Icon = { light: 'file:../icons/selltostate.svg', dark: 'file:../icons/selltostate.dark.svg' };

	documentationUrl = 'https://docs.selltostate.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Create a key at https://app.selltostate.com/account/keys. Data needs an active plan.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.selltostate.com',
			url: '/api/v1/whoami',
			method: 'GET',
		},
	};
}
