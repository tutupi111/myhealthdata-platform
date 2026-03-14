/**
 * Mock data for patient portal. No API, no auth, no database.
 */

export const MOCK_DID = "did:ehf:cn:patient:8f4a2c91";

export const MOCK_PROFILE = {
  fullName: "张明",
  diseaseType: "特发性肺纤维化",
  diagnosisDate: "2023-06",
  hospitalName: "北京协和医院",
  recordCount: 12,
  consentCount: 2,
};

export type RecordType =
  | "门诊记录"
  | "出院小结"
  | "检查报告"
  | "影像资料"
  | "基因检测"
  | "用药记录"
  | "其他";

export interface MockHealthRecord {
  id: string;
  recordType: RecordType;
  title: string;
  recordDate: string;
  sourceOrganization: string | null;
  summary: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

export const MOCK_HEALTH_RECORDS: MockHealthRecord[] = [
  {
    id: "r1",
    recordType: "出院小结",
    title: "2024年1月住院小结",
    recordDate: "2024-01-15",
    sourceOrganization: "北京协和医院",
    summary: "IPF 常规随访，肺功能稳定。",
    reviewStatus: "approved",
    createdAt: "2024-01-20",
  },
  {
    id: "r2",
    recordType: "检查报告",
    title: "胸部高分辨率CT",
    recordDate: "2024-01-10",
    sourceOrganization: "北京协和医院",
    summary: "双肺网格影，较前相仿。",
    reviewStatus: "approved",
    createdAt: "2024-01-12",
  },
  {
    id: "r3",
    recordType: "用药记录",
    title: "抗纤维化用药记录",
    recordDate: "2023-12-01",
    sourceOrganization: null,
    summary: "尼达尼布 150mg bid，规律服用。",
    reviewStatus: "approved",
    createdAt: "2023-12-05",
  },
  {
    id: "r4",
    recordType: "门诊记录",
    title: "呼吸科门诊",
    recordDate: "2023-09-08",
    sourceOrganization: "北京协和医院",
    summary: "主诉气短，活动后加重。",
    reviewStatus: "approved",
    createdAt: "2023-09-08",
  },
];

export interface MockStudy {
  id: string;
  title: string;
  organization: string;
  diseaseType: string;
  status: "recruiting" | "closed";
  updatedAt: string;
  requiredRecordTypes: string[];
}

export const MOCK_STUDIES: MockStudy[] = [
  {
    id: "s1",
    title: "特发性肺纤维化真实世界研究",
    organization: "中国医学科学院呼吸病学研究所",
    diseaseType: "特发性肺纤维化",
    status: "recruiting",
    updatedAt: "2024-02-01",
    requiredRecordTypes: ["出院小结", "检查报告", "用药记录"],
  },
  {
    id: "s2",
    title: "IPF 患者长期随访与生活质量研究",
    organization: "北京协和医院",
    diseaseType: "特发性肺纤维化",
    status: "recruiting",
    updatedAt: "2024-01-28",
    requiredRecordTypes: ["门诊记录", "检查报告", "影像资料"],
  },
  {
    id: "s3",
    title: "肺纤维化生物标志物探索研究",
    organization: "上海肺科医院",
    diseaseType: "特发性肺纤维化",
    status: "closed",
    updatedAt: "2023-12-15",
    requiredRecordTypes: ["基因检测", "检查报告"],
  },
];

export interface MockConsent {
  id: string;
  projectTitle: string;
  projectId: string;
  authorizationScope: string[];
  authorizedAt: string;
  expiredAt: string | null;
  status: "active" | "expired" | "revoked";
}

export const MOCK_CONSENTS: MockConsent[] = [
  {
    id: "c1",
    projectTitle: "特发性肺纤维化真实世界研究",
    projectId: "s1",
    authorizationScope: ["出院小结", "检查报告", "用药记录"],
    authorizedAt: "2024-01-25",
    expiredAt: "2024-07-25",
    status: "active",
  },
  {
    id: "c2",
    projectTitle: "IPF 患者长期随访与生活质量研究",
    projectId: "s2",
    authorizationScope: ["门诊记录", "检查报告"],
    authorizedAt: "2024-02-10",
    expiredAt: "2024-08-10",
    status: "active",
  },
];

export const RECORD_TYPE_OPTIONS: RecordType[] = [
  "门诊记录",
  "出院小结",
  "检查报告",
  "影像资料",
  "基因检测",
  "用药记录",
  "其他",
];
