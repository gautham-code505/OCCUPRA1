// Static copy of the seeded campus spaces (code, type, capacity) for offline scripts.
export const CATALOG = [
  ['LIB-MAIN', 'LIBRARY', 200], ['LIB-DIGI', 'LIBRARY', 120],
  ['LAB-01', 'COMPUTER_LAB', 80], ['LAB-02', 'COMPUTER_LAB', 75], ['LAB-03', 'COMPUTER_LAB', 60],
  ['LAB-AI', 'RESEARCH_LAB', 50], ['RES-01', 'RESEARCH_LAB', 40],
  ['SR-01', 'STUDY_ROOM', 24], ['SR-02', 'STUDY_ROOM', 20], ['SR-03', 'STUDY_ROOM', 20],
  ['CAN-01', 'CANTEEN', 250], ['SEM-01', 'SEMINAR_HALL', 180],
  ['CLS-01', 'CLASSROOM', 150], ['CLS-02', 'CLASSROOM', 120], ['SAC-01', 'ACTIVITY_CENTER', 160],
].map(([code, type, capacity]) => ({ code: code as string, type: type as string, capacity: capacity as number }));
