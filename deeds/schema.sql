-- Deed records from the Prohibition, Excise & Registration Department, Govt. of Bihar.
-- One deed has many parties and many properties.

CREATE TABLE deeds (
    deed_id              INTEGER PRIMARY KEY,
    token_no             INTEGER NOT NULL,          -- Token No. / Application No.
    serial_number        INTEGER NOT NULL,
    registration_date    DATE    NOT NULL,          -- stored ISO (YYYY-MM-DD)
    registration_year    INTEGER NOT NULL,
    book_no              INTEGER NOT NULL,
    document_no          INTEGER NOT NULL,
    filing_year          INTEGER NOT NULL,
    chargeable_value_inr NUMERIC(14,2) NOT NULL,
    presented_by         TEXT    NOT NULL,
    registration_office  TEXT    NOT NULL,
    transaction_type     TEXT    NOT NULL,          -- e.g. Sale/Conveyance
    deed_category        TEXT    NOT NULL,          -- e.g. General
    procedure            TEXT    NOT NULL,          -- e.g. Register As original
    UNIQUE (registration_office, registration_year, book_no, document_no)
);

CREATE TABLE deed_parties (
    party_id             INTEGER PRIMARY KEY,
    deed_id              INTEGER NOT NULL REFERENCES deeds(deed_id) ON DELETE CASCADE,
    s_no                 INTEGER NOT NULL,
    party_type           TEXT    NOT NULL,          -- Executant / Claimant
    name                 TEXT    NOT NULL,
    father_husband_name  TEXT,
    address              TEXT,
    UNIQUE (deed_id, s_no)
);

CREATE TABLE deed_properties (
    property_id          INTEGER PRIMARY KEY,
    deed_id              INTEGER NOT NULL REFERENCES deeds(deed_id) ON DELETE CASCADE,
    s_no                 INTEGER NOT NULL,
    property_type        TEXT    NOT NULL,          -- e.g. Land
    registration_office  TEXT    NOT NULL,
    circle               TEXT,
    village_thana        TEXT,
    area_type            TEXT,
    ulb                  TEXT,                      -- Urban Local Body
    land_type            TEXT,                      -- e.g. Ek Phasla
    market_value_inr     NUMERIC(14,2),
    khata_no             TEXT,                      -- text: values like "147 ETC"
    plot_no              TEXT,                      -- text: values like "6/603 ETC"
    area_decimal         NUMERIC(12,4),             -- area in decimals
    boundary_east        TEXT,
    boundary_west        TEXT,
    boundary_north       TEXT,
    boundary_south       TEXT,
    UNIQUE (deed_id, s_no)
);

CREATE INDEX idx_parties_deed    ON deed_parties(deed_id);
CREATE INDEX idx_properties_deed ON deed_properties(deed_id);
CREATE INDEX idx_parties_name    ON deed_parties(name);
