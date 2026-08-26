from app.api.reports import csv_safe


def test_csv_safe_neutralizes_spreadsheet_formulas():
    assert csv_safe('=HYPERLINK("https://example.invalid")').startswith("'=")
    assert csv_safe("  +1+1").startswith("'")
    assert csv_safe("Sự cố bình thường") == "Sự cố bình thường"
