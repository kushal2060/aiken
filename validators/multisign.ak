use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction, TransactionId}

pub type MultisigDatum {
  owners: List<VerificationKeyHash>,
  threshold: Int,
}

pub type MultisigRedeemer {
  Spend
}

validator multisign {
  spend(
    datum: Option<MultisigDatum>,
    redeemer: MultisigRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    //expect datum to be present
    expect Some(MultisigDatum { owners, threshold }) = datum

    let signatures = self.extra_signatories

    let valid_signatures =
      list.filter(signatures, fn(sign) { list.has(owners, sign) })

    let signature_count = list.length(valid_signatures)

    signature_count >= threshold
  }

  else(_) {
    fail
  }
}

test multisignex() {
  let owner1: VerificationKeyHash =
    #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"
  let owner2: VerificationKeyHash =
    #"11223344112233441122334411223344112233441122334411223344"
  let owner3: VerificationKeyHash =
    #"55667788556677885566778855667788556677885566778855667788"

  let datum =
    Some(MultisigDatum { owners: [owner1, owner2, owner3], threshold: 2 })
  let redeemer = Spend
  let own_ref = OutputReference { transaction_id: #"", output_index: 0 }

  let mock_tx =
    Transaction {
      ..transaction.placeholder,
      extra_signatories: [owner1, owner2],
    }
  multisign.spend(datum, redeemer, own_ref, mock_tx)
}

test multisignex1() {
  let owner1: VerificationKeyHash =
    #"aabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd"
  let owner2: VerificationKeyHash =
    #"11223344112233441122334411223344112233441122334411223344"
  let owner3: VerificationKeyHash =
    #"55667788556677885566778855667788556677885566778855667788"
  let attacker: VerificationKeyHash =
    #"99999999999999999999999999999999999999999999999999999999"

  let datum =
    Some(MultisigDatum { owners: [owner1, owner2, owner3], threshold: 2 })
  let redeemer = Spend
  let own_ref = OutputReference { transaction_id: #"", output_index: 0 }

  let mock_tx =
    Transaction {
      ..transaction.placeholder,
      extra_signatories: [owner1, attacker],
    }
  multisign.spend(datum, redeemer, own_ref, mock_tx)
}
