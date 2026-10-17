from config.errors import Conflict


class ReportAlreadyReviewed(Conflict):
    default_detail = "이미 검수한 제보예요."
