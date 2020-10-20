# school_data.py
# by Preston Hager

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from fake_useragent import UserAgent
import json
import time

HELP_MESSAGE = """
"""

def search(school):
    global user_agent
    name = school["name"]
    city = school["city"]
    state = school["state"]
    if name == None:
        return "N/A"
    elif city == None:
        city = ""
    elif state == None:
        state = ""
    search_string = '+'.join([name, city, state, "how+many+students"])

    options = Options()
    ua = user_agent.random
    options.add_argument(f"user-agent={ua}")
    print("Initializing driver...")
    driver = webdriver.Chrome(options=options)
    print("DONE!\nFetching URL...")
    matched_elements = driver.get(f"https://www.google.com/search?q={search_string}")

    answer_element = driver.find_elements_by_class_name("XcVN5d");

    if len(answer_element) == 1:
        value = answer_element[0].text
    elif len(answer_element) == 0:
        value = "N/A"
    else:
        value = ' or '.join([e.text for e in answer_element])
    driver.close()
    return value

def main(all_schools, start_index=0):
    global user_agent
    print("DONE!\nInitializing the User Agents...")
    user_agent = UserAgent(verify_ssl=False)
    print("DONE!\nInterating through schools...")
    # loop through each school and find how many students it has.
    for s in range(start_index, len(all_schools)):
        school = all_schools[s]
        number_of_students = search(school)
        print(f"Found: '{number_of_students}' for school #{s+1}")
        school["total_students"] = number_of_students

if __name__ == '__main__':
    # get the command arguments.
    import plum
    arguments = plum.get_args({
        "open_file": ["-o", "--open"],
        "save_file": ["-s", "--save", "--save-file"],
        "start_index": ["-s", "--start"],
        "help": ["-h", "--help"]
    }, defaults={
        "open_file": "schools.json",
        "save_file": "school_data.json",
        "start_index": 1,
        "help": False
    })
    # if the help was asked, then provide.
    if arguments["help"]:
        print(HELP_MESSAGE)
        quit()
    # open the file with all the schools in it.
    print("Opening JSON file...")
    with open(arguments["open_file"]) as f_in:
        all_schools = json.load(f_in)
    try:
        main(all_schools, arguments["start_index"]-1)
    except:
        # if an error occurs, we don't want to loose our work, so we save!
        print("An error occurred! Saving the current data...")
    # save the schools with the new data.
    with open(arguments["save_file"], 'w') as f_out:
        json.dump(all_schools, f_out)
    print("DONE!")
