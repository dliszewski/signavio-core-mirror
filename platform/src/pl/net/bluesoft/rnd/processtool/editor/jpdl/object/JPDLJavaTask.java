package pl.net.bluesoft.rnd.processtool.editor.jpdl.object;

import org.apache.commons.codec.binary.Base64;
import org.json.JSONException;
import org.json.JSONObject;
import pl.net.bluesoft.rnd.processtool.editor.AperteWorkflowDefinitionGenerator;
import pl.net.bluesoft.rnd.processtool.editor.XmlUtil;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class JPDLJavaTask extends JPDLTask {
	
	private Map<String,String> stepDataMap = new HashMap<String,String>();

    public JPDLJavaTask(AperteWorkflowDefinitionGenerator generator) {
        super(generator);
    }

    @Override
	public String toXML() { 
		StringBuilder sb = new StringBuilder();
		sb.append(String.format("<java auto-wire=\"true\" cache=\"false\" class=\"pl.net.bluesoft.rnd.pt.ext.jbpm.JbpmStepAction\" " +
                "g=\"%d,%d,%d,%d\" method=\"invoke\" name=\"%s\" var=\"RESULT\">\n", boundsX, boundsY, width, height,name));
		sb.append("<field name=\"stepName\">\n");
		sb.append(String.format("<string value=\"%s\"/>\n",taskType));
		sb.append("</field>\n");
		sb.append("<field name=\"params\">\n");
		sb.append("<map>\n");
		if (!stepDataMap.isEmpty()) {
			for (String key : stepDataMap.keySet()) {
				sb.append("<entry>\n");
				sb.append("<key>\n");
				sb.append(String.format("<string value=\"%s\"/>\n", key));
				sb.append("</key>\n");
				sb.append("<value>\n");

                // check for the quote symbol, because we don't have specific XML library here
                String value = stepDataMap.get(key);
                if (value.contains("\"")) {
                    value = value.replaceAll("\"", "'");
                }
                
                sb.append(String.format("<string value=\"%s\"/>\n", value));
				sb.append("</value>\n");
				sb.append("</entry>\n");
			}
		}
		sb.append("</map>\n");
		sb.append("</field>\n");
		sb.append(getTransitionsXML());
		sb.append("</java>\n");
		return sb.toString();

    }

	@Override
	public void fillBasicProperties(JSONObject json) throws JSONException {
		super.fillBasicProperties(json);
		String stepDataJson = json.getJSONObject("properties").getString("aperte-conf");
		if (stepDataJson != null && stepDataJson.trim().length() != 0) {
		  stepDataJson = XmlUtil.decodeXmlEscapeCharacters(stepDataJson);
		  JSONObject stepDataJsonObj = new JSONObject(stepDataJson);
		  Iterator i = stepDataJsonObj.keys();
		  while(i.hasNext()) {
			String key = (String)i.next();  
            Object value = stepDataJsonObj.get(key);  
            if (value instanceof String) {
                byte[] bytes = Base64.decodeBase64(((String) value).getBytes());
                value = new String(bytes);
            }
			stepDataMap.put(key, value.toString());
		  }
		}

	}
	
	@Override
	public String getObjectName() {
		return "Automatic step";
	}
}
