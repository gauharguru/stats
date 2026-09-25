-- Deed records from the Prohibition, Excise & Registration Department, Govt. of Bihar.
-- Single flat table: one row per (deed, party, property). A deed with several
-- parties or properties repeats its document columns on each row.

CREATE TABLE deed_records (
    id                           INTEGER PRIMARY KEY,

    -- 1. Document details
    token_no                     INTEGER NOT NULL,          -- Token No. / Application No.
    serial_number                INTEGER NOT NULL,
    registration_date            DATE    NOT NULL,          -- stored ISO (YYYY-MM-DD)
    registration_year            INTEGER NOT NULL,
    book_no                      INTEGER NOT NULL,
    document_no                  INTEGER NOT NULL,
    filing_year                  INTEGER NOT NULL,
    chargeable_value_inr         NUMERIC(14,2) NOT NULL,
    presented_by                 TEXT    NOT NULL,
    registration_office          TEXT    NOT NULL,
    transaction_type             TEXT    NOT NULL,          -- e.g. Sale/Conveyance
    deed_category                TEXT    NOT NULL,          -- e.g. General
    procedure                    TEXT    NOT NULL,          -- e.g. Register As original

    -- 2. Party details
    party_s_no                   INTEGER,
    party_type                   TEXT,                      -- Executant / Claimant
    party_name                   TEXT,
    party_father_husband_name    TEXT,
    party_address                TEXT,

    -- 3. Property details
    property_s_no                INTEGER,
    property_type                TEXT,                      -- e.g. Land
    property_registration_office TEXT,
    circle                       TEXT,
    village_thana                TEXT,
    area_type                    TEXT,
    ulb                          TEXT,                      -- Urban Local Body
    land_type                    TEXT,                      -- e.g. Ek Phasla
    market_value_inr             NUMERIC(14,2),
    khata_no                     TEXT,                      -- text: values like "147 ETC"
    plot_no                      TEXT,                      -- text: values like "6/603 ETC"
    area_decimal                 NUMERIC(12,4),             -- area in decimals
    boundary_east                TEXT,
    boundary_west                TEXT,
    boundary_north               TEXT,
    boundary_south               TEXT,

    UNIQUE (registration_office, registration_year, book_no, document_no, party_s_no, property_s_no)
);

CREATE INDEX idx_deed_records_document ON deed_records(registration_office, registration_year, book_no, document_no);
CREATE INDEX idx_deed_records_party    ON deed_records(party_name);
