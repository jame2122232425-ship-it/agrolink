import csv
from abc import ABC, abstractmethod
from datetime import date, datetime
from pathlib import Path
from zipfile import BadZipFile, ZipFile


CSV_COLUMNS = (
    "commodity_slug",
    "county_code",
    "market_id",
    "price_type",
    "unit_slug",
    "unit_quantity",
    "minimum_price",
    "maximum_price",
    "average_price",
    "variety_grade",
    "livestock_price_basis",
    "livestock_breed",
    "animal_age_category",
    "animal_sex",
    "body_condition",
    "animal_weight_kg",
    "observation_date",
    "source_reference",
)
REQUIRED_CSV_COLUMNS = CSV_COLUMNS[:-1]

MAX_CSV_BYTES = 10 * 1024 * 1024
MAX_CSV_ROWS = 10000
MAX_XLSX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024


class MarketImportError(Exception):
    pass


class MarketDataProvider(ABC):
    """Base interface for trusted market-data adapters."""

    @abstractmethod
    def iter_rows(self):
        ...


class CSVMarketDataProvider(MarketDataProvider):
    def __init__(self, path):
        self.path = Path(path)

    def iter_rows(self):
        if self.path.suffix.lower() != ".csv":
            raise MarketImportError("The import file must have a .csv extension.")
        try:
            file_size = self.path.stat().st_size
        except OSError as exc:
            raise MarketImportError(f"Unable to read the import file: {exc}") from exc
        if file_size > MAX_CSV_BYTES:
            raise MarketImportError("The CSV file exceeds the 10 MB limit.")

        try:
            with self.path.open("r", encoding="utf-8-sig", newline="") as stream:
                reader = csv.DictReader(stream, strict=True)
                if reader.fieldnames is None:
                    raise MarketImportError("The CSV file is empty.")
                if len(reader.fieldnames) != len(set(reader.fieldnames)):
                    raise MarketImportError("The CSV contains duplicate column names.")
                missing = set(REQUIRED_CSV_COLUMNS) - set(reader.fieldnames)
                unexpected = set(reader.fieldnames) - set(CSV_COLUMNS)
                if missing or unexpected:
                    details = []
                    if missing:
                        details.append(f"missing columns: {', '.join(sorted(missing))}")
                    if unexpected:
                        details.append(f"unexpected columns: {', '.join(sorted(unexpected))}")
                    raise MarketImportError("Invalid CSV header (" + "; ".join(details) + ").")

                for row_number, row in enumerate(reader, start=2):
                    if row_number - 1 > MAX_CSV_ROWS:
                        raise MarketImportError(f"The CSV exceeds the {MAX_CSV_ROWS} row limit.")
                    if None in row:
                        raise MarketImportError(f"Row {row_number} has more fields than the header.")
                    if any(value is None for value in row.values()):
                        raise MarketImportError(f"Row {row_number} has fewer fields than the header.")
                    row.setdefault("source_reference", "")
                    yield row_number, row
        except UnicodeDecodeError as exc:
            raise MarketImportError("The CSV must be UTF-8 encoded.") from exc
        except csv.Error as exc:
            raise MarketImportError(f"Invalid CSV content: {exc}") from exc
        except OSError as exc:
            raise MarketImportError(f"Unable to read the import file: {exc}") from exc


class XLSXMarketDataProvider(MarketDataProvider):
    def __init__(self, path):
        self.path = Path(path)

    def iter_rows(self):
        if self.path.suffix.lower() != ".xlsx":
            raise MarketImportError("The workbook must have a .xlsx extension.")
        try:
            file_size = self.path.stat().st_size
        except OSError as exc:
            raise MarketImportError(f"Unable to read the import file: {exc}") from exc
        if file_size > MAX_CSV_BYTES:
            raise MarketImportError("The workbook exceeds the 10 MB limit.")

        try:
            with ZipFile(self.path) as archive:
                total_uncompressed = sum(item.file_size for item in archive.infolist())
                if total_uncompressed > MAX_XLSX_UNCOMPRESSED_BYTES:
                    raise MarketImportError("The workbook expands beyond the 100 MB safety limit.")
        except (BadZipFile, OSError) as exc:
            raise MarketImportError("The workbook is not a valid .xlsx file.") from exc

        try:
            from openpyxl import load_workbook
        except ImportError as exc:
            raise MarketImportError("Excel imports require the openpyxl dependency.") from exc

        workbook = None
        try:
            workbook = load_workbook(self.path, read_only=True, data_only=False, keep_links=False)
            sheet = workbook.active
            if sheet.max_row is None or sheet.max_row < 1:
                raise MarketImportError("The workbook's first worksheet is empty.")
            if sheet.max_row > MAX_CSV_ROWS + 1 or (sheet.max_column or 0) > len(CSV_COLUMNS):
                raise MarketImportError(f"The workbook exceeds the {MAX_CSV_ROWS} row or column limit.")

            header_cells = next(sheet.iter_rows(min_row=1, max_row=1))
            if any(cell.data_type == "f" for cell in header_cells):
                raise MarketImportError("The workbook header must contain literal values.")
            headers = [cell.value for cell in header_cells]
            while headers and headers[-1] is None:
                headers.pop()
            if any(not isinstance(header, str) for header in headers):
                raise MarketImportError("The workbook header must contain text column names.")
            if len(headers) != len(set(headers)):
                raise MarketImportError("The workbook contains duplicate column names.")
            missing = set(REQUIRED_CSV_COLUMNS) - set(headers)
            unexpected = set(headers) - set(CSV_COLUMNS)
            if missing or unexpected:
                details = []
                if missing:
                    details.append(f"missing columns: {', '.join(sorted(missing))}")
                if unexpected:
                    details.append(f"unexpected columns: {', '.join(sorted(unexpected))}")
                raise MarketImportError("Invalid workbook header (" + "; ".join(details) + ").")

            inspected_columns = max(len(headers), sheet.max_column or len(headers))
            for row_number, cells in enumerate(
                sheet.iter_rows(min_row=2, max_col=inspected_columns), start=2
            ):
                if any(cell.data_type == "f" for cell in cells):
                    raise MarketImportError(f"Row {row_number} contains a formula; use literal values.")
                if any(cell.value is not None for cell in cells[len(headers):]):
                    raise MarketImportError(
                        f"Row {row_number} contains data outside the declared header."
                    )
                values = [self._as_text(cell.value) for cell in cells[:len(headers)]]
                if not any(values):
                    continue
                row = dict(zip(headers, values))
                row.setdefault("source_reference", "")
                yield row_number, row
        except (BadZipFile, OSError, ValueError) as exc:
            raise MarketImportError(f"Unable to read the workbook: {exc}") from exc
        finally:
            if workbook is not None:
                workbook.close()

    @staticmethod
    def _as_text(value):
        if value is None:
            return ""
        if isinstance(value, datetime):
            return value.date().isoformat()
        if isinstance(value, date):
            return value.isoformat()
        return str(value).strip()


PROVIDER_ADAPTERS = {
    "csv": CSVMarketDataProvider,
    "xlsx": XLSXMarketDataProvider,
}


def get_market_data_provider(provider_name, *args, **kwargs):
    provider_class = PROVIDER_ADAPTERS.get(provider_name)
    if provider_class is None:
        raise MarketImportError(f"Unsupported market-data provider: {provider_name}.")
    return provider_class(*args, **kwargs)
