// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PatientRecords
 * @author PneumoVision Medical Systems
 * @notice Decentralized patient identity, consent management, and tamper-evident medical record audit trail.
 * @dev Medical payloads remain off-chain; only cryptographic hashes (SHA-256 / Keccak-256) and storage URI references are committed on-chain.
 */
contract PatientRecords {
    // -------------------------------------------------------------------------
    // Enums & Structs
    // -------------------------------------------------------------------------

    enum RecordType {
        Diagnosis,
        Treatment,
        Medication,
        Outcome
    }

    struct Record {
        uint256 recordId;
        RecordType recordType;
        bytes32 contentHash;      // Cryptographic digest of the off-chain clinical report/data
        string offChainRef;       // Off-chain URI/storage identifier (e.g. backend report ID or IPFS CID)
        address authorProvider;   // Address of the authorized physician/hospital that authored the entry
        uint256 timestamp;        // Block timestamp when record was immutably committed
    }

    struct PatientProfile {
        address patientAddress;   // Wallet address of the patient (identity owner)
        bool isRegistered;        // Registration status flag
        uint256 registeredAt;     // Timestamp of patient registration
    }

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------

    address public owner;
    uint256 private _recordIdCounter;

    // patientId (pseudonymous bytes32 hash) => PatientProfile
    mapping(bytes32 => PatientProfile) public patients;

    // patientId => list of tamper-evident medical records
    mapping(bytes32 => Record[]) private _patientRecords;

    // patientId => (providerAddress => isGranted)
    mapping(bytes32 => mapping(address => bool)) private _accessPermissions;

    // providerAddress => isAuthorized
    mapping(address => bool) public authorizedProviders;

    // providerAddress => providerName
    mapping(address => string) public providerNames;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event PatientRegistered(bytes32 indexed patientId, address indexed patientAddress, uint256 timestamp);
    event ProviderAuthorized(address indexed providerAddress, string name, uint256 timestamp);
    event ProviderRevoked(address indexed providerAddress, uint256 timestamp);
    event AccessGranted(bytes32 indexed patientId, address indexed grantee, uint256 timestamp);
    event AccessRevoked(bytes32 indexed patientId, address indexed grantee, uint256 timestamp);
    event RecordAdded(
        bytes32 indexed patientId,
        uint256 indexed recordId,
        RecordType indexed recordType,
        bytes32 contentHash,
        string offChainRef,
        address authorProvider,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // Custom Errors
    // -------------------------------------------------------------------------

    error OnlyContractOwner();
    error PatientAlreadyRegistered(bytes32 patientId);
    error PatientNotRegistered(bytes32 patientId);
    error InvalidPatientId();
    error UnauthorizedProvider(address caller);
    error NotPatientOwner(address caller);
    error AccessDenied(bytes32 patientId, address caller);
    error InvalidAddress();
    error InvalidContentHash();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyContractOwner();
        _;
    }

    modifier onlyAuthorizedProvider() {
        if (!authorizedProviders[msg.sender]) revert UnauthorizedProvider(msg.sender);
        _;
    }

    modifier onlyPatient(bytes32 patientId) {
        if (!patients[patientId].isRegistered) revert PatientNotRegistered(patientId);
        if (patients[patientId].patientAddress != msg.sender) revert NotPatientOwner(msg.sender);
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        // Deployer is authorized as default initial healthcare provider admin
        authorizedProviders[msg.sender] = true;
        providerNames[msg.sender] = "PneumoVision Health System (Admin)";
        emit ProviderAuthorized(msg.sender, "PneumoVision Health System (Admin)", block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Provider Management (Admin)
    // -------------------------------------------------------------------------

    /**
     * @notice Registers or authorizes a verified hospital or doctor address.
     * @param provider Address of the medical provider.
     * @param name Descriptive legal identifier/name of the hospital or doctor.
     */
    function authorizeProvider(address provider, string calldata name) external onlyOwner {
        if (provider == address(0)) revert InvalidAddress();
        authorizedProviders[provider] = true;
        providerNames[provider] = name;
        emit ProviderAuthorized(provider, name, block.timestamp);
    }

    /**
     * @notice Revokes authorization of a doctor or hospital address.
     * @param provider Address of the medical provider to revoke.
     */
    function revokeProvider(address provider) external onlyOwner {
        if (provider == address(0)) revert InvalidAddress();
        authorizedProviders[provider] = false;
        emit ProviderRevoked(provider, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Patient Identity Management
    // -------------------------------------------------------------------------

    /**
     * @notice Registers a pseudonymous patient identity mapped to the caller's address.
     * @param patientId Cryptographic identifier (e.g. keccak256 hash of patient identity salt), zero PII.
     */
    function registerPatient(bytes32 patientId) external {
        if (patientId == bytes32(0)) revert InvalidPatientId();
        if (patients[patientId].isRegistered) revert PatientAlreadyRegistered(patientId);

        patients[patientId] = PatientProfile({
            patientAddress: msg.sender,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        emit PatientRegistered(patientId, msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Consent & Access Control Management
    // -------------------------------------------------------------------------

    /**
     * @notice Grants view permission for patient records to a specified doctor or hospital.
     * @dev Callable only by the patient's own registered address.
     * @param patientId Pseudonymous ID of the patient.
     * @param hospitalOrDoctor Address of the provider receiving consent.
     */
    function grantAccess(bytes32 patientId, address hospitalOrDoctor) external onlyPatient(patientId) {
        if (hospitalOrDoctor == address(0)) revert InvalidAddress();
        _accessPermissions[patientId][hospitalOrDoctor] = true;
        emit AccessGranted(patientId, hospitalOrDoctor, block.timestamp);
    }

    /**
     * @notice Revokes view permission for patient records from a specified provider.
     * @dev Callable only by the patient's own registered address.
     * @param patientId Pseudonymous ID of the patient.
     * @param hospitalOrDoctor Address of the provider whose consent is revoked.
     */
    function revokeAccess(bytes32 patientId, address hospitalOrDoctor) external onlyPatient(patientId) {
        if (hospitalOrDoctor == address(0)) revert InvalidAddress();
        _accessPermissions[patientId][hospitalOrDoctor] = false;
        emit AccessRevoked(patientId, hospitalOrDoctor, block.timestamp);
    }

    /**
     * @notice Checks if an address has permission to view a patient's records.
     * @param patientId Pseudonymous ID of the patient.
     * @param caller Address to verify.
     * @return bool True if caller is the patient or an authorized grantee.
     */
    function hasAccess(bytes32 patientId, address caller) public view returns (bool) {
        if (!patients[patientId].isRegistered) return false;
        if (patients[patientId].patientAddress == caller) return true;
        return _accessPermissions[patientId][caller];
    }

    // -------------------------------------------------------------------------
    // Medical Records Management
    // -------------------------------------------------------------------------

    /**
     * @notice Appends a tamper-evident medical record on-chain.
     * @dev Callable only by an authorized hospital or doctor address.
     * @param patientId Pseudonymous ID of the patient.
     * @param recordType Enum: Diagnosis, Treatment, Medication, Outcome.
     * @param contentHash Cryptographic hash of the off-chain clinical report payload.
     * @param offChainRef Storage reference / report ID stored in the off-chain backend DB.
     * @return recordId Unique sequential identifier of the created record.
     */
    function addRecord(
        bytes32 patientId,
        RecordType recordType,
        bytes32 contentHash,
        string calldata offChainRef
    ) external onlyAuthorizedProvider returns (uint256 recordId) {
        if (!patients[patientId].isRegistered) revert PatientNotRegistered(patientId);
        if (contentHash == bytes32(0)) revert InvalidContentHash();

        _recordIdCounter += 1;
        recordId = _recordIdCounter;

        Record memory newRecord = Record({
            recordId: recordId,
            recordType: recordType,
            contentHash: contentHash,
            offChainRef: offChainRef,
            authorProvider: msg.sender,
            timestamp: block.timestamp
        });

        _patientRecords[patientId].push(newRecord);

        emit RecordAdded(
            patientId,
            recordId,
            recordType,
            contentHash,
            offChainRef,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Retrieves all tamper-evident records for a patient.
     * @dev Reverts with AccessDenied unless caller is the patient or has active granted access.
     * @param patientId Pseudonymous ID of the patient.
     * @return Array of Record structs.
     */
    function getRecords(bytes32 patientId) external view returns (Record[] memory) {
        if (!patients[patientId].isRegistered) revert PatientNotRegistered(patientId);
        if (!hasAccess(patientId, msg.sender)) revert AccessDenied(patientId, msg.sender);

        return _patientRecords[patientId];
    }

    /**
     * @notice Retrieves the total count of records committed for a patient.
     * @param patientId Pseudonymous ID of the patient.
     * @return Count of records.
     */
    function getRecordCount(bytes32 patientId) external view returns (uint256) {
        if (!patients[patientId].isRegistered) revert PatientNotRegistered(patientId);
        if (!hasAccess(patientId, msg.sender)) revert AccessDenied(patientId, msg.sender);

        return _patientRecords[patientId].length;
    }
}
