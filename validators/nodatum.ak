use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}

pub type MultisigDatum {
  threshold: Int,
}

pub type MultisigRedeemer {
  Spend
}

validator nodatum(
  owner1: VerificationKeyHash,
  owner2: VerificationKeyHash,
  owner3: VerificationKeyHash,
) {
  spend(
    datum: Option<MultisigDatum>,
    _redeemer: MultisigRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(MultisigDatum { threshold }) = datum
    let owners = [owner1, owner2, owner3]
    let signatures = self.extra_signatories
    let valid_signatures =
      list.filter(signatures, fn(sign) { list.has(owners, sign) })
    list.length(valid_signatures) >= threshold
  }

  else(_) {
    fail
  }
}
