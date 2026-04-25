import { createClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

const supabaseUrl = `https://${projectId}.supabase.co`
const supabaseAnonKey = 'sb_publishable_eq_87YruHA20rfL99lso_A_MTXRK_Em'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
