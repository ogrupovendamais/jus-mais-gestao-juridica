const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = `docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -c "
    -- Create table for templates
    CREATE TABLE IF NOT EXISTS public.document_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

    -- Policies
    CREATE POLICY \\"Allow select on document_templates\\" ON public.document_templates FOR SELECT USING (true);
    CREATE POLICY \\"Allow insert on document_templates\\" ON public.document_templates FOR INSERT WITH CHECK (true);
    CREATE POLICY \\"Allow update on document_templates\\" ON public.document_templates FOR UPDATE USING (true);
    CREATE POLICY \\"Allow delete on document_templates\\" ON public.document_templates FOR DELETE USING (true);

    -- Ensure 'documentos' bucket exists (it might already exist)
    INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false) ON CONFLICT DO NOTHING;
    
    -- Ensure 'templates' bucket exists
    INSERT INTO storage.buckets (id, name, public) VALUES ('templates', 'templates', false) ON CONFLICT DO NOTHING;
    
    -- Storage policies for templates bucket
    CREATE POLICY \\"Allow select on templates bucket\\" ON storage.objects FOR SELECT USING (bucket_id = 'templates');
    CREATE POLICY \\"Allow insert on templates bucket\\" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'templates');
    CREATE POLICY \\"Allow delete on templates bucket\\" ON storage.objects FOR DELETE USING (bucket_id = 'templates');
    CREATE POLICY \\"Allow update on templates bucket\\" ON storage.objects FOR UPDATE USING (bucket_id = 'templates');

    NOTIFY pgrst, 'reload schema';
  "`;
  
  conn.exec(containerCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data)).stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
