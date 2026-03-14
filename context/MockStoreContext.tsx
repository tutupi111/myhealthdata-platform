"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  MOCK_DID,
  MOCK_HEALTH_RECORDS,
  MOCK_PROFILE,
  type RecordType,
} from "@/lib/mock/patient";

/** 带患者 DID 的健康记录（存入 store） */
export interface StoreHealthRecord {
  id: string;
  patientDid: string;
  recordType: RecordType;
  title: string;
  recordDate: string;
  sourceOrganization: string | null;
  summary: string | null;
  reviewStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

/** 授权记录（与 MockConsent 一致，供三端共用） */
export interface StoreConsent {
  id: string;
  patientDid: string;
  projectId: string;
  projectTitle: string;
  authorizationScope: string[];
  authorizedAt: string;
  expiredAt: string | null;
  status: "active" | "expired" | "revoked";
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const initialRecords: StoreHealthRecord[] = MOCK_HEALTH_RECORDS.map((r) => ({
  ...r,
  patientDid: MOCK_DID,
}));

const initialConsents: StoreConsent[] = [];

interface MockStoreValue {
  healthRecords: StoreHealthRecord[];
  consents: StoreConsent[];
  addHealthRecord: (record: Omit<StoreHealthRecord, "id" | "createdAt" | "reviewStatus">) => StoreHealthRecord;
  addConsent: (consent: Omit<StoreConsent, "id" | "authorizedAt" | "expiredAt" | "status">) => StoreConsent;
  /** 当前登录患者 DID（患者端用，mock 固定） */
  currentPatientDid: string;
  /** 患者档案摘要（研究者端展示用，按 DID 查） */
  getPatientProfile: (did: string) => { diseaseType: string; diagnosisDate: string } | null;
}

const MockStoreContext = createContext<MockStoreValue | null>(null);

export function MockStoreProvider({ children }: { children: React.ReactNode }) {
  const [healthRecords, setHealthRecords] = useState<StoreHealthRecord[]>(initialRecords);
  const [consents, setConsents] = useState<StoreConsent[]>(initialConsents);

  const addHealthRecord = useCallback(
    (input: Omit<StoreHealthRecord, "id" | "createdAt" | "reviewStatus">) => {
      const created: StoreHealthRecord = {
        ...input,
        id: nextId("r"),
        reviewStatus: "pending",
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setHealthRecords((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const addConsent = useCallback(
    (input: Omit<StoreConsent, "id" | "authorizedAt" | "expiredAt" | "status">) => {
      const now = new Date().toISOString().slice(0, 10);
      const expired = new Date();
      expired.setDate(expired.getDate() + 180);
      const created: StoreConsent = {
        ...input,
        id: nextId("c"),
        authorizedAt: now,
        expiredAt: expired.toISOString().slice(0, 10),
        status: "active",
      };
      setConsents((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const getPatientProfile = useCallback((did: string) => {
    if (did === MOCK_DID) {
      return {
        diseaseType: MOCK_PROFILE.diseaseType,
        diagnosisDate: MOCK_PROFILE.diagnosisDate,
      };
    }
    return null;
  }, []);

  const value: MockStoreValue = useMemo(
    () => ({
      healthRecords,
      consents,
      addHealthRecord,
      addConsent,
      currentPatientDid: MOCK_DID,
      getPatientProfile,
    }),
    [healthRecords, consents, addHealthRecord, addConsent, getPatientProfile]
  );

  return (
    <MockStoreContext.Provider value={value}>
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore(): MockStoreValue {
  const ctx = useContext(MockStoreContext);
  if (!ctx) throw new Error("useMockStore must be used within MockStoreProvider");
  return ctx;
}
