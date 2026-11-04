export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<{ id: string; nome: string; email: string; matricula: string | null; funcao: string | null; equipe: string | null; gestor: string | null; role: string; ativo: boolean; status: string; created_at: string; updated_at: string }>;
      employee_directory: Table<{ id: string; nome: string; email: string | null; matricula: string | null; horario_trabalho: string | null; local_trabalho: string | null; perfil: string | null; ativo: boolean; auth_user_id: string | null; created_at: string }>;
      teams: Table<{ id: string; name: string; code: string | null; description: string | null; active: boolean; area_id: string | null; created_by: string | null; created_at: string; updated_at: string }>;
      team_members: Table<{ id: string; team_id: string; user_id: string; active: boolean; started_at: string; ended_at: string | null; created_by: string | null; created_at: string }>;
      manager_team_assignments: Table<{ id: string; manager_id: string; team_id: string; active: boolean; valid_from: string; valid_until: string | null; created_by: string | null; created_at: string }>;
      assessment_cycles: Table<{ id: string; titulo: string; descricao: string | null; data_inicio: string; data_fim: string | null; ativo: boolean; created_at: string }>;
      themes: Table<{ id: string; codigo: string; nome: string; descricao: string; ordem: number; tipo: string; peso: number; ativo: boolean }>;
      questions: Table<{ id: string; theme_id: string | null; section_id: string | null; numero: number; texto: string; tipo: string; ordem: number; obrigatoria: boolean; ativa: boolean; weight: number; dimension_code: string | null; settings: Json }>;
      answers: Table<{ id: string; assessment_id: string; question_id: string; score: number | null; selected_option_id: string | null; numeric_value: number | null; text_value: string | null; boolean_value: boolean | null; date_value: string | null; created_at: string; updated_at: string }>;
      answer_option_selections: Table<{ answer_id: string; option_id: string; created_at: string }>;
      text_answers: Table<{ id: string; assessment_id: string; question_id: string; answer_text: string; created_at: string; updated_at: string }>;
      assessments: Table<{ id: string; cycle_id: string; user_id: string; status: string; usuario_confirmado: boolean; pergunta_atual: number; iniciada_em: string; concluida_em: string | null; created_at: string; updated_at: string; campaign_participant_id: string | null; questionnaire_version_id: string | null }>;
      assessment_results: Table<{ id: string; assessment_id: string; dominancia: number; influencia: number; estabilidade: number; conformidade: number; seguranca: number; disciplina: number; trabalho_equipe: number; comunicacao: number; indice_competencias: number; perfil_predominante: string; resultado_ponderado: number | null; classificacao_competencias: string | null; faixas_disc: Json; recomendacao: string | null; calculado_em: string }>;
      audit_logs: Table<{ id: number; user_id: string | null; assessment_id: string | null; event_type: string; metadata: Json; created_at: string }>;
      questionnaires: Table<{ id: string; title: string; description: string | null; slug: string; owner_id: string | null; status: string; visibility: string; settings: Json; created_at: string; updated_at: string }>;
      questionnaire_versions: Table<{ id: string; questionnaire_id: string; version_number: number; status: string; published_at: string | null; published_by: string | null; created_at: string }>;
      questionnaire_sections: Table<{ id: string; version_id: string; code: string; title: string; description: string | null; section_type: string; display_order: number; settings: Json }>;
      question_options: Table<{ id: string; question_id: string; label: string; score: number | null; display_order: number }>;
      campaigns: Table<{ id: string; name: string; description: string | null; assessment_cycle_id: string; questionnaire_version_id: string | null; owner_id: string | null; starts_at: string; ends_at: string | null; status: string; result_visibility: string; require_assignment: boolean; created_at: string; updated_at: string }>;
      campaign_teams: Table<{ campaign_id: string; team_id: string; created_at: string }>;
      campaign_participants: Table<{ id: string; campaign_id: string; participant_id: string; team_id: string | null; status: string; assigned_by: string | null; assigned_at: string }>;
      invitations: Table<{ id: string; email: string; team_id: string | null; role: string; invited_by: string; status: string; expires_at: string; accepted_at: string | null; created_at: string }>;
      disc_profile_catalog: Table<{ code: string; name: string; description: string; traits: string[]; color: string; sort_order: number; action_recommendation: string }>;
    };
    Views: {
      admin_assessment_results: { Row: { assessment_id: string; cycle_id: string; user_id: string; participante: string; email: string; matricula: string | null; funcao: string | null; equipe: string | null; gestor: string | null; status: string; iniciada_em: string; concluida_em: string | null; dominancia: number | null; influencia: number | null; estabilidade: number | null; conformidade: number | null; seguranca: number | null; disciplina: number | null; trabalho_equipe: number | null; comunicacao: number | null; indice_competencias: number | null; perfil_predominante: string | null; resultado_ponderado: number | null; classificacao_competencias: string | null; faixas_disc: Json | null; recomendacao: string | null; total_score: number | null; dimensions: Json | null; dominant_dimension: string | null }; Relationships: [] };
    };
    Functions: {
      people_onboarding_summary: { Args: Record<string, never>; Returns: Array<{ total_people: number; passwords_created: number; not_started: number; in_progress: number; completed: number }> };
      accept_current_user_invitation: { Args: Record<string, never>; Returns: undefined };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_manager: { Args: Record<string, never>; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      is_auditor: { Args: Record<string, never>; Returns: boolean };
      manages_team: { Args: { p_team_id: string }; Returns: boolean };
      can_access_participant: { Args: { p_participant_id: string }; Returns: boolean };
      can_view_assessment: { Args: { p_assessment_id: string }; Returns: boolean };
      can_view_question: { Args: { p_question_id: string }; Returns: boolean };
      team_assessment_progress: { Args: { p_team_id: string | null }; Returns: Array<{ team_id: string; team_name: string; user_id: string; participant_name: string; matricula: string | null; funcao: string | null; assessment_id: string | null; status: string | null; answered_required: number; total_required: number; completion_percent: number; concluded_at: string | null }> };
      team_member_work_schedules: { Args: { p_team_id: string | null }; Returns: Array<{ user_id: string; horario_trabalho: string | null }> };
      set_team_member_work_schedule: { Args: { p_user_id: string; p_horario_trabalho: string | null }; Returns: undefined };
      add_team_member: { Args: { p_team_id: string; p_user_id: string }; Returns: string };
      can_manage_questionnaire: { Args: { p_questionnaire_id: string }; Returns: boolean };
      create_questionnaire: { Args: { p_title: string; p_description: string; p_slug: string; p_visibility: string }; Returns: string };
      create_questionnaire_version: { Args: { p_questionnaire_id: string }; Returns: string };
      publish_questionnaire_version: { Args: { p_version_id: string }; Returns: undefined };
      add_question_to_section: { Args: { p_section_id: string; p_text: string; p_type: string; p_required: boolean; p_weight: number; p_dimension_code: string; p_options: string[] }; Returns: string };
      create_campaign: { Args: { p_name: string; p_description: string; p_questionnaire_version_id: string; p_team_ids: string[]; p_starts_at: string; p_ends_at: string | null; p_result_visibility: string }; Returns: string };
      assign_participant_to_campaign: { Args: { p_campaign_id: string; p_participant_id: string; p_team_id: string }; Returns: string };
      set_profile_access: { Args: { p_user_id: string; p_role: string; p_status: string }; Returns: undefined };
      assign_manager_to_team: { Args: { p_manager_id: string; p_team_id: string; p_valid_from: string; p_valid_until: string | null }; Returns: undefined };
      create_team: { Args: { p_name: string; p_code: string; p_description: string; p_area_id: string | null }; Returns: string };
      start_assessment: { Args: { p_cycle_id: string }; Returns: string };
      save_scale_answer: { Args: { p_assessment_id: string; p_question_id: string; p_score: number }; Returns: undefined };
      save_text_answer: { Args: { p_assessment_id: string; p_question_id: string; p_answer_text: string }; Returns: undefined };
      save_question_answer: { Args: { p_assessment_id: string; p_question_id: string; p_value: Json }; Returns: undefined };
      complete_assessment: { Args: { p_assessment_id: string }; Returns: undefined };
      search_employee_directory: { Args: { p_query: string }; Returns: { employee_id: string; name: string; email: string | null; employee_number: string | null; profile: string | null; has_account: boolean; has_password: boolean; email_confirmed: boolean }[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type Question = Database["public"]["Tables"]["questions"]["Row"];