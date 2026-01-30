use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
use mocktail.{complete, invalid_before, mocktail_tx, required_signer_hash}
use mocktail/virgin_key_hash.{mock_pub_key_hash}
use mocktail/virgin_output_reference.{mock_utxo_ref}
use vodka_extra_signatories.{key_signed}
use vodka_validity_range.{valid_after}

pub type VestingDatum {
  lock_until: Int,
  owners: List<VerificationKeyHash>,
  threshold: Int,
  beneficiary: VerificationKeyHash,
}

validator multisign_vesting {
  spend(
    datum: Option<VestingDatum>,
    _redeemer: Data,
    _input: OutputReference,
    tx: Transaction,
  ) {
    expect Some(datum) = datum
    let signatures = tx.extra_signatories
    let valid_signatures =
      list.filter(signatures, fn(sign) { list.has(datum.owners, sign) })
    let signature_count = list.length(valid_signatures)
    or {
      signature_count >= datum.threshold,
      and {
        key_signed(tx.extra_signatories, datum.beneficiary),
        valid_after(tx.validity_range, datum.lock_until),
      },
    }
  }

  else(_) {
    fail
  }
}

type TestCase1 {
  is_owner1_signed: Bool,
  is_owner2_signed: Bool,
}

type TestCase2 {
  is_owner1_signed: Bool,
  is_beneficiary_signed: Bool,
  is_lock_time_passedzz: Bool,
}

fn get_test_tx1(test_case: TestCase1) {
  let TestCase1 { is_owner1_signed, is_owner2_signed } = test_case
  mocktail_tx()
    |> required_signer_hash(is_owner1_signed, mock_pub_key_hash(1))
    |> required_signer_hash(is_owner2_signed, mock_pub_key_hash(2))
    |> complete()
}

fn get_test_tx2(test_case: TestCase2) {
  let TestCase2 {
    is_owner1_signed,
    is_beneficiary_signed,
    is_lock_time_passedzz,
  } = test_case
  mocktail_tx()
    |> required_signer_hash(is_owner1_signed, mock_pub_key_hash(1))
    |> required_signer_hash(is_beneficiary_signed, mock_pub_key_hash(3))
    |> invalid_before(is_lock_time_passedzz, 1672843961002)
    |> complete()
}

fn vesting_datum() {
  VestingDatum {
    lock_until: 1672843961001,
    owners: [mock_pub_key_hash(1), mock_pub_key_hash(2)],
    threshold: 2,
    beneficiary: mock_pub_key_hash(3),
  }
}

test multisign_vesting() {
  let output_reference = mock_utxo_ref(0, 1)
  let datum = Some(vesting_datum())
  //   let test_case = TestCase1 { is_owner1_signed: True, is_owner2_signed: True }
  let test_case =
    TestCase2 {
      is_owner1_signed: True,
      is_beneficiary_signed: True,
      is_lock_time_passedzz: True,
    }
  let tx = get_test_tx2(test_case)
  multisign_vesting.spend(datum, Void, output_reference, tx)
}
