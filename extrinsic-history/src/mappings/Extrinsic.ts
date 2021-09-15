import { SignedBlock, EventRecord, Balance } from '@polkadot/types/interfaces';
import { Extrinsic } from '../types';
import { SignedBlockExtended } from '@polkadot/api-derive/type/types';

export async function handleBlock(thisBlock: SignedBlock): Promise<void> {

	await Promise.all(thisBlock.block.extrinsics.map(async extrinsic => {
		if (extrinsic.isSigned && isTransfer(extrinsic.method.method)) {
			const entity = new Extrinsic(extrinsic.hash.toString());
			entity.blockNumber = thisBlock.block.header.number.toBigInt();
			entity.source = extrinsic.signer.toString();

			const [actualArgs] = extractArgs(extrinsic.args)
			if (actualArgs[0]) {
				entity.destination = actualArgs[0].toString()
			}
			if (actualArgs[1]) {
				entity.amount = BigInt(actualArgs[1].toString())
			}

			const totalFee = extractTotalFeeFromEvents(thisBlock as SignedBlockExtended)
			const tip = extrinsic.tip.toBigInt()
			entity.totalFee = totalFee
			entity.tip =  tip
			entity.fee = totalFee - tip

			await entity.save();
		}
	}));
}

function extractArgs(args: unknown[]): [unknown[]] {
	const actualArgs = args.slice();
	return [actualArgs];
}

function extractTotalFeeFromEvents(blockExtended: SignedBlockExtended): bigint {
	const feeEvent = blockExtended.events.find(event => isFeeEvent(event))
	return (feeEvent.event.data[1] as Balance).toBigInt()
}

function isTransfer(method: string): boolean {
	return method.startsWith('transfer')
}

function isFeeEvent(event: EventRecord) {
	return event.event.index.toHex() == "0x0404";
}