const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("PatientRecords Smart Contract", function () {
  let patientRecords;
  let owner, doctor, ungrantedHospital, grantedHospital, patientWallet, otherAccount;

  // Sample pseudonymous patient hash (e.g. SHA-256 / Keccak-256 of patient UUID + salt)
  const patientId = ethers.keccak256(ethers.toUtf8Bytes("PATIENT_ANON_UUID_49182"));
  const sampleContentHash = ethers.keccak256(ethers.toUtf8Bytes("PNEUMOVISION_CLINICAL_REPORT_PAYLOAD_V1"));
  const offChainRef = "reports/RPT-CASE-POS-842.json";

  // RecordType Enum indices matching Solidity contract
  const RecordType = {
    Diagnosis: 0,
    Treatment: 1,
    Medication: 2,
    Outcome: 3,
  };

  beforeEach(async function () {
    [owner, doctor, ungrantedHospital, grantedHospital, patientWallet, otherAccount] =
      await ethers.getSigners();

    const PatientRecordsFactory = await ethers.getContractFactory("PatientRecords");
    patientRecords = await PatientRecordsFactory.deploy();
    await patientRecords.waitForDeployment();

    // Authorize doctor provider
    await patientRecords.connect(owner).authorizeProvider(doctor.address, "Dr. Alice Morgan (Pulmonologist)");

    // Register patient identity from patient's own wallet
    await patientRecords.connect(patientWallet).registerPatient(patientId);
  });

  describe("1. Deployment & Identity Registration", function () {
    it("should set deployer as owner and initial authorized provider", async function () {
      expect(await patientRecords.owner()).to.equal(owner.address);
      expect(await patientRecords.authorizedProviders(owner.address)).to.be.true;
    });

    it("should register patient with pseudonymous hash and correct owner address", async function () {
      const profile = await patientRecords.patients(patientId);
      expect(profile.isRegistered).to.be.true;
      expect(profile.patientAddress).to.equal(patientWallet.address);
    });

    it("should revert if attempting to register a duplicate patientId", async function () {
      await expect(
        patientRecords.connect(otherAccount).registerPatient(patientId)
      ).to.be.revertedWithCustomError(patientRecords, "PatientAlreadyRegistered");
    });

    it("should revert if patientId is bytes32(0)", async function () {
      await expect(
        patientRecords.connect(patientWallet).registerPatient(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(patientRecords, "InvalidPatientId");
    });
  });

  describe("2. Healthcare Provider Authorization", function () {
    it("should allow owner to authorize and revoke medical providers", async function () {
      expect(await patientRecords.authorizedProviders(doctor.address)).to.be.true;
      expect(await patientRecords.providerNames(doctor.address)).to.equal("Dr. Alice Morgan (Pulmonologist)");

      await patientRecords.connect(owner).revokeProvider(doctor.address);
      expect(await patientRecords.authorizedProviders(doctor.address)).to.be.false;
    });

    it("should reject provider authorization from non-owner accounts", async function () {
      await expect(
        patientRecords.connect(doctor).authorizeProvider(ungrantedHospital.address, "Hospital B")
      ).to.be.revertedWithCustomError(patientRecords, "OnlyContractOwner");
    });
  });

  describe("3. Adding Medical Records (Doctor / Hospital)", function () {
    it("should allow authorized doctor to add records across all RecordType enums", async function () {
      // 1. Diagnosis Record
      const txDiag = await patientRecords
        .connect(doctor)
        .addRecord(patientId, RecordType.Diagnosis, sampleContentHash, offChainRef);

      await expect(txDiag)
        .to.emit(patientRecords, "RecordAdded")
        .withArgs(patientId, 1, RecordType.Diagnosis, sampleContentHash, offChainRef, doctor.address, anyValue);

      // 2. Treatment Record
      await patientRecords
        .connect(doctor)
        .addRecord(patientId, RecordType.Treatment, sampleContentHash, "treatment/TRT-001");

      // 3. Medication Record
      await patientRecords
        .connect(doctor)
        .addRecord(patientId, RecordType.Medication, sampleContentHash, "meds/MED-AZITHROMYCIN-500MG");

      // 4. Outcome Record
      await patientRecords
        .connect(doctor)
        .addRecord(patientId, RecordType.Outcome, sampleContentHash, "outcomes/OUT-RESOLVED");

      // Patient verifies record count
      const count = await patientRecords.connect(patientWallet).getRecordCount(patientId);
      expect(count).to.equal(4n);
    });

    it("should reject addRecord from unauthorized entities", async function () {
      await expect(
        patientRecords
          .connect(otherAccount)
          .addRecord(patientId, RecordType.Diagnosis, sampleContentHash, offChainRef)
      ).to.be.revertedWithCustomError(patientRecords, "UnauthorizedProvider");
    });

    it("should reject addRecord for unregistered patientId", async function () {
      const nonExistentPatient = ethers.keccak256(ethers.toUtf8Bytes("UNREGISTERED_PATIENT"));
      await expect(
        patientRecords
          .connect(doctor)
          .addRecord(nonExistentPatient, RecordType.Diagnosis, sampleContentHash, offChainRef)
      ).to.be.revertedWithCustomError(patientRecords, "PatientNotRegistered");
    });
  });

  describe("4. Consent-Gated Access Control Workflow (Grant, Revoke, Read)", function () {
    beforeEach(async function () {
      // Doctor adds initial record
      await patientRecords
        .connect(doctor)
        .addRecord(patientId, RecordType.Diagnosis, sampleContentHash, offChainRef);
    });

    it("should allow patient to read their own records at any time", async function () {
      const records = await patientRecords.connect(patientWallet).getRecords(patientId);
      expect(records.length).to.equal(1);
      expect(records[0].recordType).to.equal(RecordType.Diagnosis);
      expect(records[0].contentHash).to.equal(sampleContentHash);
      expect(records[0].offChainRef).to.equal(offChainRef);
      expect(records[0].authorProvider).to.equal(doctor.address);
    });

    it("ungranted hospital cannot read records (reverts with AccessDenied)", async function () {
      expect(await patientRecords.hasAccess(patientId, ungrantedHospital.address)).to.be.false;

      await expect(
        patientRecords.connect(ungrantedHospital).getRecords(patientId)
      ).to.be.revertedWithCustomError(patientRecords, "AccessDenied");
    });

    it("after patient grants access, hospital can read records", async function () {
      // Patient grants access to grantedHospital
      await expect(patientRecords.connect(patientWallet).grantAccess(patientId, grantedHospital.address))
        .to.emit(patientRecords, "AccessGranted")
        .withArgs(patientId, grantedHospital.address, anyValue);

      expect(await patientRecords.hasAccess(patientId, grantedHospital.address)).to.be.true;

      // Hospital reads records
      const records = await patientRecords.connect(grantedHospital).getRecords(patientId);
      expect(records.length).to.equal(1);
      expect(records[0].contentHash).to.equal(sampleContentHash);
    });

    it("after patient revokes access, hospital cannot read records", async function () {
      // 1. Grant
      await patientRecords.connect(patientWallet).grantAccess(patientId, grantedHospital.address);
      expect(await patientRecords.hasAccess(patientId, grantedHospital.address)).to.be.true;

      // 2. Revoke
      await expect(patientRecords.connect(patientWallet).revokeAccess(patientId, grantedHospital.address))
        .to.emit(patientRecords, "AccessRevoked")
        .withArgs(patientId, grantedHospital.address, anyValue);

      expect(await patientRecords.hasAccess(patientId, grantedHospital.address)).to.be.false;

      // 3. Attempt to read -> Revert
      await expect(
        patientRecords.connect(grantedHospital).getRecords(patientId)
      ).to.be.revertedWithCustomError(patientRecords, "AccessDenied");
    });


    it("should prevent non-patient third parties from granting or revoking access", async function () {
      await expect(
        patientRecords.connect(otherAccount).grantAccess(patientId, grantedHospital.address)
      ).to.be.revertedWithCustomError(patientRecords, "NotPatientOwner");

      await expect(
        patientRecords.connect(otherAccount).revokeAccess(patientId, grantedHospital.address)
      ).to.be.revertedWithCustomError(patientRecords, "NotPatientOwner");
    });
  });
});
