
const STRINGS = {
    APP_TITLE: "은퇴 시뮬레이터 (동적 포트폴리오)",
    HEADER: {
        TITLE: "은퇴 <span class='text-primary'>시뮬레이터</span>",
        SUBTITLE: "동적 포트폴리오 • 이벤트 기반 • 영구 저장",
        PROFILE_TITLE: "로컬 프로필",
        PROFILE_SUBTITLE: "브라우저에 저장됨"
    },
    CONFIG: {
        TITLE: "기본 설정",
        RESET_BUTTON: "저장된 데이터 초기화",
        AGE_NOW_LABEL: "현재 나이",
        AGE_RETIRE_LABEL: "은퇴 나이",
        RESET_CONFIRM: "저장된 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다."
    },
    SCENARIO: {
        TITLE: "시나리오",
        PRESET_BUTTON: "프리셋",
        ADD_BUTTON: "시나리오 추가",
        SUPPORTED_ITEMS: "지원 항목: <span class='font-semibold'>포트폴리오 변경</span>, <span class='font-semibold'>월 정기 투자금 변경</span>, <span class='font-semibold'>일시불</span>, <span class='font-semibold'>월 정기 출금</span>, <span class='font-semibold'>월 정기 기타 수입</span>.",
        NO_EVENTS: "시나리오가 없습니다. “시나리오 추가”를 클릭하여 시작하세요.",
        VIEW_MORE: "전체 보기 (+{0}개)",
        VIEW_LESS: "간략히 보기"
    },
    RESULTS: {
        TITLE: "연간 성장 예측",
        RANGE_LABEL: "분석 기간: {0}년 ({1}세) ~ {2}년 ({3}세)",
        FILTER_TOOLTIP: "결과 필터",
        CHART_TOOLTIP: "차트 보기"
    },
    FILTER: {
        TITLE: "표 필터 (나이 범위)",
        AGE_FROM_LABEL: "시작 나이",
        AGE_TO_LABEL: "종료 나이",
        ENABLE_LABEL: "필터 활성화"
    },
    CHART: {
        TITLE: "자산 구성",
        SUBTITLE: "연도별 누적 투자원금 및 투자수익",
        PRINCIPAL_LABEL: "누적 투자원금",
        RETURN_LABEL: "누적 투자수익",
        TOTAL_LABEL: "총합: {0}"
    },
    TABLE: {
        HEADER_YEAR_AGE: "연도<br/>나이",
        HEADER_CONTRIBUTION: "연 투자금",
        HEADER_RETURN: "평가<br/>수익",
        HEADER_DIVIDEND: "배당금<br/>(세후)",
        HEADER_WITHDRAWAL: "현금흐름<br/>(출금)",
        HEADER_BALANCE: "연말<br/>잔액",
        HEADER_PORTFOLIO: "포트폴리오",
        TOOLTIP_CONTRIBUTION: "연간 총 투자금입니다.<br>계산식: <b>월 정기 투자금 x 12 + 일시불 입금</b>",
        TOOLTIP_RETURN: "연간 발생한 총 투자 수익금입니다. (배당 제외)",
        TOOLTIP_DIVIDEND: "연간 발생한 총 배당금입니다. (세후 15.4% 적용)",
        TOOLTIP_WITHDRAWAL: "연간 순수 현금 흐름입니다. 양수(+)는 순수입, 음수(-)는 순출금을 의미합니다.<br><b>계산식: (기타 수입) - (정기 출금 + 일시불 출금)</b>",
        TOOLTIP_BALANCE: "해당 연도 말 기준 총 잔액입니다.<br>계산식: <b>기초 잔액 + 연간 투자금 + 평가 수익 + 배당금 - 포트폴리오 인출액</b>",
        TOOLTIP_PORTFOLIO: "해당 연도에 적용된 포트폴리오 구성입니다. 마우스를 올리면 전체 구성을 확인할 수 있습니다.",
        PORTFOLIO_UNDEFINED: "정의되지 않음",
        UNINVESTED_CASH: "미투자 현금"
    },
    OBSERVATION: {
        TITLE: "분석 결과 요약",
        INITIAL_TEXT: "좌측 설정을 변경하여 나의 은퇴 계획을 분석해보세요.",
        RETIRE_RESULT: "{0}세 ({1}) 은퇴 시점에 예상 잔액은 {2}으로 예상됩니다. ",
        FINAL_RESULT: "{0}세 ({1})에 예상 잔액은 {2}으로 예상됩니다.",
        NO_RESULT: "분석 결과가 없습니다."
    },
    FOOTER: {
        COPYRIGHT: "© 2024 은퇴계획 Pro. 데이터는 브라우저에 저장됩니다. 본 시뮬레이션은 투자 자문이 아닙니다."
    },
    EVENT_DIALOG: {
        ADD_TITLE: "시나리오 이벤트 추가",
        EDIT_TITLE: "시나리오 이벤트 수정",
        AGE_LABEL: "나이",
        TYPE_LABEL: "종류",
        TYPE_PORTFOLIO: "포트폴리오 변경",
        TYPE_MONTHLY: "월 정기 투자금 변경",
        TYPE_LUMP: "일시 입/출금",
        TYPE_WITHDRAWAL: "월 정기 출금",
        TYPE_INCOME: "월 정기 기타 수입",
        PRESET_LABEL: "투자 프리셋",
        WEIGHT_LABEL: "비중 (1-10)",
        LABEL_LABEL: "라벨",
        LABEL_PLACEHOLDER: "예: 초기 투자금, 국민연금",
        AMOUNT_LABEL: "금액 (₩)",
        AMOUNT_PLACEHOLDER: "예: 1500000",
        INFO_PORTFOLIO: "해당 나이부터 포트폴리오 구성을 변경합니다. 같은 나이에 여러 개의 프리셋을 추가하여 비중을 조절할 수 있습니다.",
        INFO_MONTHLY: "해당 나이부터 월 정기 투자금을 새로 설정합니다.",
        INFO_LUMP: "해당 나이에 일시불로 입금 또는 출금합니다.",
        INFO_WITHDRAWAL: "해당 나이부터 매월 고정된 금액을 정기적으로 출금합니다.",
        INFO_INCOME: "국민연금, 개인연금 등 투자와 무관한 월 정기 수입입니다. 이 수입은 투자금에 합산되지 않고, 월 정기 출금액을 상쇄하여 포트폴리오 인출을 줄이는 데 사용됩니다.",
        CANCEL_BUTTON: "취소",
        ADD_BUTTON: "시나리오 추가",
        SAVE_BUTTON: "변경 내용 저장"
    },
    PRESET_DIALOG: {
        TITLE: "투자 프리셋 관리",
        INFO: "프리셋을 클릭하여 수정하거나, 아래에서 새 프리셋을 추가하세요.",
        ADD_TITLE: "새 프리셋 추가",
        EDIT_TITLE: "프리셋 수정",
        NAME_LABEL: "프리셋 이름",
        NAME_PLACEHOLDER: "예: 성장주 포트폴리오",
        RETURN_LABEL: "연간 수익률 (%)",
        DIVIDEND_LABEL: "배당 수익률 (%)",
        SAVE_BUTTON: "저장"
    },
    EVENT_CARD: {
        SUBTITLE_PORTFOLIO: "전략: {0}, 비중: {1}",
        SUBTITLE_MONTHLY: "{0} 월 정기 투자금 {1}으로 변경",
        SUBTITLE_LUMP_IN: "{0} 일시불 입금 {1}",
        SUBTITLE_LUMP_OUT: "{0} 일시불 출금 {1}",
        SUBTITLE_WITHDRAWAL: "{0} 월 정기 출금 {1}/월",
        SUBTITLE_INCOME: "{0} 월 정기 수입 {1}/월",
        UNKNOWN_EVENT: "알 수 없는 이벤트",
        PILL_PORTFOLIO: "포트폴리오",
        PILL_MONTHLY: "정기 투자",
        PILL_LUMP: "일시불",
        PILL_WITHDRAWAL: "현금 인출",
        PILL_INCOME: "기타 수입",
        TOOLTIP_ENABLE: "시뮬레이션에 적용",
        TOOLTIP_DISABLE: "시뮬레이션에서 제외",
        EDIT_TOOLTIP: "수정",
        DELETE_TOOLTIP: "삭제"
    },
    TOOLTIP: {
        PORTFOLIO_TITLE: "{0}년 포트폴리오",
        BALANCE_LABEL: "연말 잔액",
        RETURN_LABEL: "평가 수익",
        DIVIDEND_LABEL: "세후 배당금",
        NO_DATA: "데이터 없음",
        EVENT_TITLE: "시나리오"
    },
    COMMON: {
        BUILTIN: "(기본)",
        RETIRE: "은퇴 ❤️",
        EVENT: "이벤트"
    }
};
