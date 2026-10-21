import {
	NodeConnectionTypes,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const SCOPE: Record<string, string> = { tender: 'tenders', buyer: 'buyers', supplier: 'suppliers' };

const show = (resource: string[], operation: string[]) => ({ show: { resource, operation } });

/** Search fields shared by the three resources. Values go to GET /api/v1/search. */
const searchFields = (resource: 'tender' | 'buyer' | 'supplier'): INodeProperties[] => [
	{
		displayName: 'Text',
		name: 'q',
		type: 'string',
		default: '',
		placeholder: 'payroll software',
		description:
			resource === 'tender'
				? 'Words in the tender title. At most 120 characters.'
				: 'Name, or the subject of the tenders it won or bought',
		displayOptions: show([resource], ['search']),
		routing: { send: { type: 'query', property: 'q' } },
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		default: '',
		placeholder: 'united-kingdom,ireland',
		description: 'Country slug, or slugs separated by commas. Empty means all countries.',
		displayOptions: show([resource], ['search']),
		// The API reads an empty value as absent, so an empty country searches all countries.
		routing: { send: { type: 'query', property: 'country' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 50 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: show([resource], ['search']),
		routing: {
			send: { type: 'query', property: 'per_page' },
			output: { maxResults: '={{$value}}' },
		},
	},
];

const tenderFilters: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'collection',
	placeholder: 'Add Filter',
	default: {},
	displayOptions: show(['tender'], ['search']),
	options: [
		{
			displayName: 'Accepts Bids Only',
			name: 'accepts_bids',
			type: 'boolean',
			default: true,
			description: 'Whether to return only open tenders whose deadline is in the future',
			routing: { send: { type: 'query', property: 'accepts_bids' } },
		},
		{
			displayName: 'Lifecycle',
			name: 'lifecycle',
			type: 'options',
			options: [
				{ name: 'Awarded', value: 'awarded' },
				{ name: 'Cancelled', value: 'cancelled' },
				{ name: 'Open', value: 'open' },
				{ name: 'Planned', value: 'planned' },
			],
			default: 'open',
			routing: { send: { type: 'query', property: 'lifecycle' } },
		},
		{
			displayName: 'Published In Last',
			name: 'published_days',
			type: 'options',
			options: [
				{ name: '1 Day', value: 1 },
				{ name: '7 Days', value: 7 },
				{ name: '30 Days', value: 30 },
				{ name: '90 Days', value: 90 },
				{ name: '365 Days', value: 365 },
			],
			default: 7,
			routing: { send: { type: 'query', property: 'published_days' } },
		},
		{
			displayName: 'Sector',
			name: 'sector',
			type: 'string',
			default: '',
			placeholder: 'it-software',
			description: 'Sector slug',
			routing: { send: { type: 'query', property: 'sector' } },
		},
		{
			displayName: 'Sort',
			name: 'sort',
			type: 'options',
			options: [
				{ name: 'Nearest Deadline', value: 'deadline' },
				{ name: 'Newest in Sell to State', value: 'added_desc' },
				{ name: 'Newest Published', value: 'published_desc' },
				{ name: 'Relevance', value: 'relevance' },
			],
			default: 'deadline',
			routing: { send: { type: 'query', property: 'sort' } },
		},
	],
};

const operation = (resource: string, noun: string): INodeProperties => ({
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [resource] } },
	options: [
		{
			name: 'Get',
			value: 'get',
			action: `Get a ${noun}`,
			description: `Get the profile of one ${noun}`,
		},
		{
			name: 'Search',
			value: 'search',
			action: `Search ${noun}s`,
			description: `Search ${noun}s by text and country`,
			routing: {
				request: { method: 'GET', url: '/api/v1/search', qs: { scope: SCOPE[resource] } },
				output: { postReceive: [{ type: 'rootProperty', properties: { property: 'hits' } }] },
			},
		},
	],
	default: 'search',
});

const getFields = (resource: string, path: string, idName: string, idLabel: string): INodeProperties[] => [
	{
		displayName: idLabel,
		name: idName,
		type: 'string',
		required: true,
		default: '',
		description: `The ${idLabel.toLowerCase()} from a search result`,
		displayOptions: show([resource], ['get']),
		routing: { request: { method: 'GET', url: `=/api/v1/${path}/{{encodeURIComponent($value)}}` } },
	},
	{
		displayName: 'Country',
		name: 'country',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'united-kingdom',
		description: 'The country slug of the search result',
		displayOptions: show([resource], ['get']),
		routing: { send: { type: 'query', property: 'country' } },
	},
];

export class SellToState implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sell to State',
		name: 'sellToState',
		icon: { light: 'file:../../icons/selltostate.svg', dark: 'file:../../icons/selltostate.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Government tenders, contract awards, buyers and suppliers from official procurement sources in 60+ countries',
		defaults: { name: 'Sell to State' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sellToStateApi', required: true }],
		requestDefaults: {
			baseURL: 'https://app.selltostate.com',
			headers: { Accept: 'application/json' },
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Buyer', value: 'buyer' },
					{ name: 'Supplier', value: 'supplier' },
					{ name: 'Tender', value: 'tender' },
				],
				default: 'tender',
			},
			operation('tender', 'tender'),
			operation('buyer', 'buyer'),
			operation('supplier', 'supplier'),
			...searchFields('tender'),
			tenderFilters,
			...searchFields('buyer'),
			...searchFields('supplier'),
			...getFields('tender', 'tenders', 'tenderId', 'Tender ID'),
			...getFields('buyer', 'buyers', 'buyerSlug', 'Buyer Slug'),
			...getFields('supplier', 'suppliers', 'supplierSlug', 'Supplier Slug'),
		],
	};
}
