-- Deed: Darbhanga, Book 1, Document 456 of 2008
-- Date on the source page is 08-01-2008 (DD-MM-YYYY) -> 2008-01-08.

INSERT INTO deeds (deed_id, token_no, serial_number, registration_date, registration_year,
                   book_no, document_no, filing_year, chargeable_value_inr, presented_by,
                   registration_office, transaction_type, deed_category, procedure)
VALUES (1, 480, 464, '2008-01-08', 2008,
        1, 456, 2008, 77000, 'Saiyad Mohammad Wahajul Islam',
        'Darbhanga', 'Sale/Conveyance', 'General', 'Register As original');

INSERT INTO deed_parties (party_id, deed_id, s_no, party_type, name, father_husband_name, address)
VALUES (1, 1, 1, 'Executant', 'Saiyad Mohammad Wahajul Islam', 'Saiyad Mohammad Kabeer', 'Baghoul Ps- Jale ,Dbg');

INSERT INTO deed_properties (property_id, deed_id, s_no, property_type, registration_office, circle,
                             village_thana, area_type, ulb, land_type, market_value_inr, khata_no,
                             plot_no, area_decimal, boundary_east, boundary_west, boundary_north,
                             boundary_south)
VALUES (1, 1, 1, 'Land', 'Darbhanga', 'Jale',
        'Baghoul', NULL, NULL, 'Ek Phasla', 1500, '147 ETC',
        '6/603 ETC', 45.0000, 'MD. IRFAN ETC', 'MD. ISHA ETC', 'NIJ KHARIDAR ETC',
        'MD. ISHA ETC');
