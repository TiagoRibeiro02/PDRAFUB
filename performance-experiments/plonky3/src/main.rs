use p3_baby_bear::{BabyBear, default_babybear_poseidon2_16};
use p3_field::PrimeCharacteristicRing;
use p3_symmetric::Permutation;

#[derive(Clone, Copy, Debug)]
struct PublicInputs {
    did: BabyBear,
    status: BabyBear,
    commitment: BabyBear,
}

#[derive(Clone, Copy, Debug)]
struct PrivateInputs {
    r: BabyBear,
}

#[derive(Clone, Copy, Debug)]
struct ComplianceInput {
    public: PublicInputs,
    private: PrivateInputs,
}

fn compute_commitment_raw(did: BabyBear, status: BabyBear, r: BabyBear) -> BabyBear {
    let poseidon = default_babybear_poseidon2_16();
    let mut state = [BabyBear::ZERO; 16];

    state[0] = did;
    state[1] = status;
    state[2] = r;

    let out = poseidon.permute(state);
    out[0]
}

fn compute_commitment(public_inputs: &PublicInputs, private_inputs: &PrivateInputs) -> BabyBear {
    compute_commitment_raw(public_inputs.did, public_inputs.status, private_inputs.r)
}

fn verify_compliance(input: &ComplianceInput) -> bool {
    if input.public.status != BabyBear::ONE {
        return false;
    }

    let computed = compute_commitment(&input.public, &input.private);
    computed == input.public.commitment
}

fn main() {
    let public_without_commitment = PublicInputs {
        did: BabyBear::from_u32(12_345),
        status: BabyBear::ONE,
        commitment: BabyBear::ZERO,
    };

    let private = PrivateInputs {
        r: BabyBear::from_u32(6_789),
    };

    let input = ComplianceInput {
        public: PublicInputs {
            commitment: compute_commitment(&public_without_commitment, &private),
            ..public_without_commitment
        },
        private,
    };

    assert!(verify_compliance(&input));
    println!("Compliance check verified successfully.");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_input() {
        let public_without_commitment = PublicInputs {
            did: BabyBear::from_u32(111),
            status: BabyBear::ONE,
            commitment: BabyBear::ZERO,
        };

        let private = PrivateInputs {
            r: BabyBear::from_u32(222),
        };

        let input = ComplianceInput {
            public: PublicInputs {
                commitment: compute_commitment(&public_without_commitment, &private),
                ..public_without_commitment
            },
            private,
        };

        assert!(verify_compliance(&input));
    }

    #[test]
    fn rejects_invalid_status() {
        let public = PublicInputs {
            did: BabyBear::from_u32(111),
            status: BabyBear::from_u32(0),
            commitment: compute_commitment_raw(
                BabyBear::from_u32(111),
                BabyBear::ONE,
                BabyBear::from_u32(222),
            ),
        };

        let private = PrivateInputs {
            r: BabyBear::from_u32(222),
        };

        let input = ComplianceInput { public, private };

        assert!(!verify_compliance(&input));
    }

    #[test]
    fn rejects_invalid_commitment() {
        let public = PublicInputs {
            did: BabyBear::from_u32(111),
            status: BabyBear::ONE,
            commitment: BabyBear::from_u32(999_999),
        };

        let private = PrivateInputs {
            r: BabyBear::from_u32(222),
        };

        let input = ComplianceInput { public, private };

        assert!(!verify_compliance(&input));
    }
}
