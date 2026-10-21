import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';

/** Re-read this many seconds before the last run, so a row indexed late is not missed. */
const OVERLAP_SECONDS = 60;
/** The slugs kept to remove duplicates of the overlap window. */
const SEEN_MAX = 500;

export class SellToStateTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sell to State Trigger',
		name: 'sellToStateTrigger',
		icon: { light: 'file:../../icons/selltostate.svg', dark: 'file:../../icons/selltostate.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{"New tenders: " + $parameter["q"]}}',
		description: 'Starts the workflow when Sell to State adds tenders that match a search',
		defaults: { name: 'Sell to State Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sellToStateApi', required: true }],
		properties: [
			{
				displayName: 'Text',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'payroll software',
				description: 'Words in the tender title. Empty matches every tender.',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'united-kingdom,ireland',
				description: 'Country slug, or slugs separated by commas. Empty means all countries.',
			},
			{
				displayName: 'Open Tenders Only',
				name: 'openOnly',
				type: 'boolean',
				default: true,
				description: 'Whether to return only tenders with the lifecycle open',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const state = this.getWorkflowStaticData('node') as { lastRun?: number; seen?: string[] };
		const now = Math.floor(Date.now() / 1000);
		const manual = this.getMode() === 'manual';

		// First activation: start from now, so the workflow does not replay old tenders.
		if (state.lastRun === undefined && !manual) {
			state.lastRun = now;
			state.seen = [];
			return null;
		}

		const qs: IDataObject = {
			scope: 'tenders',
			sort: 'added_desc',
			per_page: 50,
		};
		const q = this.getNodeParameter('q', '') as string;
		const country = this.getNodeParameter('country', '') as string;
		if (q) qs.q = q;
		if (country) qs.country = country;
		if (this.getNodeParameter('openOnly', true) as boolean) qs.lifecycle = 'open';
		// A manual test shows the newest matches; a live run asks for the rows added after the last run.
		if (!manual) qs.added_after = Math.max((state.lastRun ?? now) - OVERLAP_SECONDS, 0);

		let hits: IDataObject[];
		try {
			const res = (await this.helpers.httpRequestWithAuthentication.call(this, 'sellToStateApi', {
				method: 'GET',
				url: 'https://app.selltostate.com/api/v1/search',
				qs,
				json: true,
			})) as { hits?: IDataObject[] };
			hits = res.hits ?? [];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		if (manual) return hits.length ? [this.helpers.returnJsonArray(hits.slice(0, 5))] : null;

		const seen = new Set(state.seen ?? []);
		const fresh = hits.filter((h) => typeof h.slug === 'string' && !seen.has(h.slug));
		state.lastRun = now;
		state.seen = [...fresh.map((h) => h.slug as string), ...(state.seen ?? [])].slice(0, SEEN_MAX);

		return fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
	}
}
