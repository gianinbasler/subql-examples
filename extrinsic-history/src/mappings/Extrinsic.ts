import { SignedBlock, EventRecord, Balance } from '@polkadot/types/interfaces';
import { GenericExtrinsic } from '@polkadot/types';
import { Extrinsic } from '../types';
import { SignedBlockExtended } from '@polkadot/api-derive/type/types';
import { SubstrateBlock } from '@subql/types';

export async function handleBlock(thisBlock: SignedBlock): Promise<void> {

	await Promise.all(thisBlock.block.extrinsics.map(async extrinsic => {
		if (extrinsic.isSigned && isTransfer(extrinsic.method.method)) {
			const entity = new Extrinsic(extrinsic.hash.toString());
			entity.blockNumber = thisBlock.block.header.number.toBigInt();
			entity.source = extrinsic.signer.toString();
			entity.timestamp = (thisBlock as SubstrateBlock).timestamp.toISOString()

			extractAndSetDestination(extrinsic, entity)
			extractAndSetFees(thisBlock as SignedBlockExtended, extrinsic.tip.toBigInt(), entity)
			extractAndSetStatus(thisBlock as SignedBlockExtended, entity)

			await entity.save();
		}
	}));
}

function extractAndSetDestination(extrinsic: GenericExtrinsic, entity: Extrinsic) {
	const [actualArgs] = extractArgs(extrinsic.args)
	if (actualArgs[0]) {
		entity.destination = actualArgs[0].toString()
	}
	if (actualArgs[1]) {
		entity.amount = (actualArgs[1] as Balance).toBigInt()
	}
}

function extractAndSetFees(blockExtended: SignedBlockExtended, tip: bigint, entity: Extrinsic) {
	const feeEvent = blockExtended.events.find(event => isFeeEvent(event))
	const totalFee = (feeEvent.event.data[1] as Balance).toBigInt()
	entity.totalFee = totalFee
	entity.tip = tip
	entity.fee = totalFee - tip
}

function extractAndSetStatus(blockExtended: SignedBlockExtended, entity: Extrinsic) {
	const errorEvent = blockExtended.events.find(event => isErrorEvent(event))
	if (errorEvent) {
		entity.status = 'Failed'
		try {
			const error = JSON.parse(errorEvent.event.data[0].toString())
			entity.moduleIndex = error['module'].index
			entity.errorIndex = error['module'].error
		}
		catch (e) {
			// in some cases, the error reason is not available in which case the JSON contains '"cannotLookup": null"'
			// leaving the indices empty in those cases
		}
	}
	else {
		entity.status = 'Success'
	}
}

function extractArgs(args: unknown[]): [unknown[]] {
	const actualArgs = args.slice();
	return [actualArgs];
}

function isTransfer(method: string): boolean {
	return method.startsWith('transfer')
}

function isFeeEvent(event: EventRecord) {
	return event.event.index.toHex() == '0x0404';
}

function isErrorEvent(event: EventRecord) {
	return event.event.index.toHex() == '0x0001';
}