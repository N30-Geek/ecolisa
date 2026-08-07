import React from 'react';
import { MembrePersonnel } from '../../types';
import { StaffFormPage } from './StaffFormPage';

interface TeacherFormPageProps {
  teacher: MembrePersonnel | null; // null = création
  targetCategory?: 'ENSEIGNANT' | 'STAFF';
  onBack: () => void;
  onSave: (data: Omit<MembrePersonnel, 'id'> & { id?: string }) => Promise<void>;
}

export const TeacherFormPage: React.FC<TeacherFormPageProps> = ({
  teacher,
  targetCategory = 'ENSEIGNANT',
  onBack,
  onSave,
}) => {
  return (
    <StaffFormPage
      staffToEdit={teacher}
      targetCategory={targetCategory}
      onBack={onBack}
      onSave={async (staff: MembrePersonnel) => {
        await onSave(staff);
      }}
    />
  );
};
