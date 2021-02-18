# ep_get_text_at_time
etherpad http api extension getTextAtTime(padID, millis)

### usage:
my.etherpad/api/1/getTextAtTime?apikey=secret&padID=welcome&millis=1613655787557

    API >= 1

sets the text of a pad

possible returns:

{code: 0, message:"ok", data: {"text":{"text":"some old text","attribs":"..."}}
{code: 1, message:`no entries for pad 'padID'`,           data: null}
{code: 1, message:`millis is undefined`,                  data: null}
{code: 1, message:`millis (abc) is not a number`,         data: null}
{code: 1, message:`millis (-123) is a negative number`,   data: null}
{code: 1, message:`millis (123.456) is not an int value`, data: null}
{code: 1, message:`time (123) preceeds first revision`,   data: null}
{code: 1, message:`internal error`,                       data: null}
