/**
 * Mock data for researcher portal. No API, no auth, no database.
 * Patients are identified by DID only; no real identity is exposed.
 */

export type ProjectStatus = "draft" | "published" | "closed";

export interface MockResearcherProject {
  id: string;
  title: string;
  organization: string;
  diseaseType: string;
  description: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  requiredRecordTypes: string[];
  authorizationDurationDays: number;
  contactEmail: string;
  status: ProjectStatus;
  consentedPatientCount: number;
  updatedAt: string;
}

/** 已授权患者（仅 DID 与脱敏信息，无真实身份） */
export interface MockConsentedPatient {
  patientDid: string;
  diseaseType: string;
  diagnosisDate: string;
  authorizedRecordTypes: string[];
  authorizedAt: string;
}

export const MOCK_RESEARCHER_PROJECTS: MockResearcherProject[] = [
  {
    id: "s1",
    title: "特发性肺纤维化真实世界研究",
    organization: "中国医学科学院呼吸病学研究所",
    diseaseType: "特发性肺纤维化",
    description: "观察特发性肺纤维化患者在真实世界中的治疗与预后情况。",
    inclusionCriteria: "经 HRCT 或病理确诊的 IPF 患者；年龄 18–80 岁。",
    exclusionCriteria: "合并其他严重肺部疾病；预期生存期 < 6 个月。",
    requiredRecordTypes: ["出院小结", "检查报告", "用药记录"],
    authorizationDurationDays: 180,
    contactEmail: "ipf-study@example.org",
    status: "published",
    consentedPatientCount: 1,
    updatedAt: "2024-02-01",
  },
  {
    id: "s2",
    title: "IPF 患者长期随访与生活质量研究",
    organization: "北京协和医院",
    diseaseType: "特发性肺纤维化",
    description: "评估 IPF 患者长期随访中的生活质量与症状变化。",
    inclusionCriteria: "确诊 IPF；愿意完成至少 12 个月随访。",
    exclusionCriteria: "无法配合随访或问卷。",
    requiredRecordTypes: ["门诊记录", "检查报告", "影像资料"],
    authorizationDurationDays: 365,
    contactEmail: "qol-study@example.org",
    status: "published",
    consentedPatientCount: 1,
    updatedAt: "2024-01-28",
  },
  {
    id: "s3",
    title: "肺纤维化生物标志物探索研究",
    organization: "上海肺科医院",
    diseaseType: "特发性肺纤维化",
    description: "探索血清与影像学生物标志物与疾病进展的关系。",
    inclusionCriteria: "确诊 IPF；有基线血清及影像学资料。",
    exclusionCriteria: "资料不完整。",
    requiredRecordTypes: ["基因检测", "检查报告"],
    authorizationDurationDays: 180,
    contactEmail: "biomarker@example.org",
    status: "closed",
    consentedPatientCount: 0,
    updatedAt: "2023-12-15",
  },
];

/** 按项目 ID 的已授权患者列表（仅 DID 与脱敏信息） */
export const MOCK_PROJECT_PATIENTS: Record<string, MockConsentedPatient[]> = {
  s1: [
    {
      patientDid: "did:ehf:cn:patient:8f4a2c91",
      diseaseType: "特发性肺纤维化",
      diagnosisDate: "2023-06",
      authorizedRecordTypes: ["出院小结", "检查报告", "用药记录"],
      authorizedAt: "2024-01-25",
    },
  ],
  s2: [
    {
      patientDid: "did:ehf:cn:patient:8f4a2c91",
      diseaseType: "特发性肺纤维化",
      diagnosisDate: "2023-06",
      authorizedRecordTypes: ["门诊记录", "检查报告"],
      authorizedAt: "2024-02-10",
    },
  ],
  s3: [],
};

/** 待处理资料请求数量（mock） */
export const MOCK_PENDING_REQUESTS_COUNT = 2;

/** 最近项目动态（mock） */
export interface MockProjectActivity {
  projectId: string;
  projectTitle: string;
  action: "consent" | "update" | "closed";
  description: string;
  at: string;
}

export const MOCK_RECENT_ACTIVITIES: MockProjectActivity[] = [
  {
    projectId: "s2",
    projectTitle: "IPF 患者长期随访与生活质量研究",
    action: "consent",
    description: "1 名患者新授权参与",
    at: "2024-02-10",
  },
  {
    projectId: "s1",
    projectTitle: "特发性肺纤维化真实世界研究",
    action: "update",
    description: "项目信息已更新",
    at: "2024-02-01",
  },
];

export const RECORD_TYPE_OPTIONS_FOR_PROJECT = [
  "门诊记录",
  "出院小结",
  "检查报告",
  "影像资料",
  "基因检测",
  "用药记录",
  "其他",
] as const;
