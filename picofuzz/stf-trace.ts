import { Header, tryAsTimeSlot } from "@typeberry/lib/block";
import { BytesBlob } from "@typeberry/lib/bytes";
import { Decoder } from "@typeberry/lib/codec";
import type { ChainSpec } from "@typeberry/lib/config";
import * as fuzz_proto from "@typeberry/lib/fuzz-proto";
import { StateTransition } from "@typeberry/lib/state-vectors";

export function parseStfVector(input: Uint8Array, spec: ChainSpec) {
  const data = BytesBlob.blobFrom(input);
  const stf = Decoder.decodeObject<StateTransition>(StateTransition.Codec, data, spec);
  const blockHeader = stf.block.header.materialize();
  const init = fuzz_proto.v1.Initialize.create({
    header: Header.empty(),
    keyvals: stf.pre_state.keyvals,
    ancestry: [
      fuzz_proto.v1.AncestryItem.create({
        headerHash: blockHeader.parentHeaderHash,
        slot: tryAsTimeSlot(Math.max(0, blockHeader.timeSlotIndex - 1)),
      }),
    ],
  });

  const initMessage: fuzz_proto.v1.MessageData = {
    type: fuzz_proto.v1.MessageType.Initialize,
    value: init,
  };

  const blockMessage: fuzz_proto.v1.MessageData = {
    type: fuzz_proto.v1.MessageType.ImportBlock,
    value: stf.block,
  };

  return {
    init: initMessage,
    block: blockMessage,
  };
}
