const STRINGS = {
    "APP_TITLE": "은퇴 시뮬레이터 | 미래를 계획하세요",
    "HEADER": {
        "TITLE": "은퇴 여정 시뮬레이터",
        "SUBTITLE": "동적 시나리오를 통해 재정적 미래를 계획하세요."
    },
    "CONFIG": {
        "TITLE": "기본 설정",
        "AGE_NOW_LABEL": "현재 나이",
        "AGE_RETIRE_LABEL": "은퇴 나이",
        "RESET_BUTTON": "모두 초기화",
        "RESET_CONFIRM": "정말로 모든 설정과 시나리오를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    },
    "SCENARIO": {
        "TITLE": "시나리오",
        "ADD_BUTTON": "이벤트 추가",
        "PRESET_BUTTON": "포트폴리오 관리",
        "SUPPORTED_ITEMS": "포트폴리오 변경, 월 투자, 일시금, 월 인출, 기타 수입 이벤트를 지원합니다.",
        "NO_EVENTS": "미래 예측을 위한 이벤트가 없습니다. '이벤트 추가' 버튼을 눌러 시나리오를 만들어보세요.",
        "VIEW_MORE": "{0}개 더 보기",
        "VIEW_LESS": "접기"
    },
    "RESULTS": {
        "TITLE": "연간 성장 예측",
        "RANGE_LABEL": "{0}년 ({1}세)부터 {2}년 ({3}세)까지의 예측",
        "CHART_TOOLTIP": "차트 보기/숨기기",
        "FILTER_TOOLTIP": "결과 필터링"
    },
    "CHART": {
        "TITLE": "자산 성장 (누적)",
        "PRINCIPAL_LABEL": "누적 원금",
        "RETURN_LABEL": "누적 수익",
        "TOTAL_LABEL": "총계: {0}"
    },
    "OBSERVATION": {
        "TITLE": "행복한 은퇴 시뮬레이션 요약",
        "RETIRE_RESULT": "은퇴 시점({0}세, {1}년)에 예상되는 총자산은 약 {2}입니다. ",
        "FINAL_RESULT": "최대 연령({0}세, {1}년)에 예상되는 총자산은 약 {2}입니다.",
        "NO_RESULT": "결과를 표시할 데이터가 충분하지 않습니다. 설정을 확인하거나 시나리오 이벤트를 추가해 주세요.",
        "SUSTAINABLE_WITHDRAWAL_DETAIL": "은퇴 시점({0}세) 자산을 기준으로 90세에 자산의 20%를 남기는 것을 목표로 할 때, 매월 약 <strong>{1}</strong> 씩 인출할 수 있습니다. 월 기타 수입 {2}을(를) 더하면, 은퇴 후 총 월 생활비는 <strong>{3}</strong>이 됩니다.",
        "SUSTAINABLE_WITHDRAWAL_NOT_APPLICABLE": "은퇴 자산이 부족하여 90세까지 지속 가능한 월 인출액을 계산할 수 없습니다."
    },
    "TABLE": {
        "HEADER_YEAR_AGE": "연도/나이",
        "HEADER_ANNUAL_CONTRIBUTION": "연간 투자",
        "HEADER_RETURN": "평가수익",
        "HEADER_DIVIDEND": "배당금",
        "HEADER_WITHDRAWAL": "연간 인출",
        "HEADER_BALANCE": "연말 잔고",
        "HEADER_PORTFOLIO": "포트폴리오",
        "HEADER_CASH_FLOW": "순 현금흐름",
        "TOOLTIP_YEAR_AGE": "시뮬레이션 연도와 해당 연도의 나이입니다.",
        "TOOLTIP_ANNUAL_CONTRIBUTION": "해당 연도에 투자된 총금액 (월 투자금 + 일시금).",
        "TOOLTIP_RETURN": "포트폴리오의 가격 변동으로 인한 연간 수익입니다.",
        "TOOLTIP_DIVIDEND": "세금(15.4%)을 제외하고 받은 총 연간 배당금입니다.",
        "TOOLTIP_WITHDRAWAL": "생활비 또는 기타 목적으로 포트폴리오에서 인출된 총금액입니다.",
        "TOOLTIP_CASH_FLOW": "연간 인출액과 투자와 무관한 기타 수입(예: 연금)을 합산한 순 현금 흐름입니다.",
        "TOOLTIP_BALANCE": "연말 기준 포트폴리오의 총 평가액입니다.",
        "TOOLTIP_PORTFOLIO": "해당 연도 말에 적용된 투자 포트폴리오 구성입니다.",
        "UNINVESTED_CASH": "미투자 현금",
        "PORTFOLIO_UNDEFINED": "정의되지 않음"
    },
    "EVENT_DIALOG": {
        "ADD_TITLE": "새 이벤트 추가",
        "EDIT_TITLE": "이벤트 수정",
        "SAVE_BUTTON": "변경사항 저장",
        "ADD_BUTTON": "이벤트 추가",
        "CANCEL_BUTTON": "취소",
        "AGE_LABEL": "나이",
        "TYPE_LABEL": "유형",
        "TYPE_PORTFOLIO": "포트폴리오 변경",
        "TYPE_MONTHLY": "월 투자",
        "TYPE_LUMP": "일시금",
        "TYPE_WITHDRAWAL": "월 인출",
        "TYPE_INCOME": "월 기타 수입",
        "PRESET_LABEL": "포트폴리오 프리셋",
        "WEIGHT_LABEL": "비중 (1-10)",
        "ICON_LABEL": "아이콘",
        "LABEL_LABEL": "레이블 (선택 사항)",
        "LABEL_PLACEHOLDER": "예: 주택 계약금",
        "AMOUNT_LABEL": "금액 (월 기준)",
        "AMOUNT_PLACEHOLDER": "예: 3,000,000",
        "INFO_PORTFOLIO": "이 나이부터 적용할 투자 포트폴리오 구성을 설정합니다. 여러 개를 추가하면 가중치에 따라 자산이 배분됩니다.",
        "INFO_MONTHLY": "이 나이부터 매월 투자할 금액입니다. 이전 값은 이 값으로 대체됩니다.",
        "INFO_LUMP": "일회성 입금(양수) 또는 출금(음수)입니다.",
        "INFO_WITHDRAWAL": "이 나이부터 매월 생활비 등으로 인출할 금액입니다. 배당금, 수익, 원금 순으로 차감됩니다.",
        "INFO_INCOME": "국민연금, 개인연금 등 투자와 무관한 월별 고정 수입입니다. 월 인출액을 상쇄하는 효과가 있습니다."
    },
    "PRESET_DIALOG": {
        "TITLE": "포트폴리오 프리셋 관리",
        "INFO": "자주 사용하는 투자 조합을 프리셋으로 저장하고 관리할 수 있습니다.",
        "ADD_TITLE": "새 프리셋 추가",
        "EDIT_TITLE": "프리셋 수정",
        "NAME_PLACEHOLDER": "프리셋 이름 (예: 성장주 중심)",
        "SAVE_BUTTON": "저장"
    },
    "EVENT_CARD": {
        "PILL_PORTFOLIO": "포트폴리오",
        "PILL_MONTHLY": "월 투자",
        "PILL_LUMP": "일시금",
        "PILL_WITHDRAWAL": "월 인출",
        "PILL_INCOME": "월 수입",
        "SUBTITLE_PORTFOLIO": "'{0}' 포트폴리오를 가중치 {1}(으)로 사용",
        "SUBTITLE_MONTHLY": "{0} 매월 {1} 투자",
        "SUBTITLE_LUMP_IN": "{0} {1} 입금",
        "SUBTITLE_LUMP_OUT": "{0} {1} 출금",
        "SUBTITLE_WITHDRAWAL": "{0} 매월 {1} 인출",
        "SUBTITLE_INCOME": "{0} 매월 {1} 수입 발생",
        "UNKNOWN_EVENT": "알 수 없는 이벤트 유형",
        "TOOLTIP_ENABLE": "이벤트 활성화",
        "TOOLTIP_DISABLE": "이벤트 비활성화",
        "EDIT_TOOLTIP": "수정",
        "DELETE_TOOLTIP": "삭제"
    },
    "TOOLTIP": {
        "PORTFOLIO_TITLE": "{0}년 포트폴리오 상세",
        "BALANCE_LABEL": "평가액",
        "RETURN_LABEL": "수익",
        "DIVIDEND_LABEL": "배당",
        "EVENT_TITLE": "이벤트",
        "NO_DATA": "표시할 데이터가 없습니다."
    },
    "FILTER": {
        "TITLE": "결과 필터",
        "AGE_FROM_LABEL": "시작 나이",
        "AGE_TO_LABEL": "종료 나이"
    },
    "ONBOARDING": {
        "TITLE_STEP_1": "환영합니다!",
        "CONTENT_STEP_1": "은퇴 시뮬레이터에 오신 것을 환영합니다. 몇 가지 간단한 단계를 통해 이 도구를 최대한 활용하는 방법을 안내해 드리겠습니다.",
        "TITLE_STEP_2": "기본 정보 설정",
        "CONTENT_STEP_2": "먼저, 현재 나이와 예상 은퇴 나이를 입력하세요. 이 정보는 시뮬레이션의 기준이 됩니다.",
        "TITLE_STEP_3": "시나리오 만들기",
        "CONTENT_STEP_3": "'이벤트 추가' 버튼을 클릭하여 투자, 입출금 등 다양한 금융 이벤트를 추가하고 자신만의 미래 시나리오를 만들어 보세요.",
        "TITLE_STEP_4": "미래 예측하기",
        "CONTENT_STEP_4": "시나리오를 바탕으로 연간 자산 변화를 확인하고, 차트와 상세 분석을 통해 재정적 미래를 예측하고 계획을 세워보세요.",
        "DONE_BUTTON": "시작하기",
        "NEXT_BUTTON": "다음"
    },
    "DISCLAIMER": {
        "TITLE": "면책 조항",
        "TEXT": "본 시뮬레이션의 결과는 사용자가 입력한 가정에 기반한 예측이며, 실제 미래 수익률을 보장하지 않습니다. 모든 투자의 최종 결정과 책임은 투자자 본인에게 있습니다. 이 정보는 투자 자문으로 간주되어서는 안 됩니다."
    },
    "COMMON": {
        "BUILTIN": "(기본)",
        "RETIRE": "은퇴",
        "EVENT": "이벤트"
    },
    "FOOTER": {
        "COPYRIGHT": "© 2024 은퇴 시뮬레이터. 면책 조항: 본 시뮬레이션은 정보 제공 목적으로만 사용되며 투자 자문으로 간주되어서는 안 됩니다."
    }
};